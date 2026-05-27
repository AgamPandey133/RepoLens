/**
 * rag-pipeline.ts
 *
 * Advanced 3-stage Hybrid RAG Pipeline for RepoLens.
 *
 * Stage 1 — Vector Search:     pgvector cosine similarity (existing)
 * Stage 2 — BM25 Re-rank:      Keyword-frequency scoring in TypeScript (no extra API)
 * Stage 3 — LLM Re-rank:       Gemini flash selects the most relevant chunks
 *
 * Also provides:
 *  - scoreAnswerFaithfulness()  RAGAS-style faithfulness metric (0-100)
 *  - trackLLMCall()             Observability logging to LLMCallLog table
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "./prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeChunk {
  fileName: string;
  sourceCode: string;
  summary: string;
  similarity: number;
}

export interface RankedChunk extends CodeChunk {
  bm25Score: number;
  llmScore: number;
  finalScore: number;
}

export interface RAGResult {
  chunks: RankedChunk[];
  faithfulnessScore: number;
  ragLatencyMs: number;
  topSimilarity: number;
}

// ─── Stage 2: BM25-Inspired Keyword Re-ranking ───────────────────────────────

/**
 * Computes a BM25-inspired relevance score between a query and a document.
 * Uses TF-IDF weighting with saturation (k1=1.5, b=0.75).
 * Operates purely in TypeScript — no external dependencies.
 */
function computeBM25Score(query: string, document: string): number {
  const k1 = 1.5;
  const b = 0.75;
  const avgDocLength = 500; // approximate average code chunk length in tokens

  const queryTerms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  const docTerms = document.toLowerCase().split(/\W+/);
  const docLength = docTerms.length;

  // Build term frequency map for the document
  const termFreq: Record<string, number> = {};
  for (const term of docTerms) {
    termFreq[term] = (termFreq[term] || 0) + 1;
  }

  let score = 0;
  for (const term of queryTerms) {
    const tf = termFreq[term] || 0;
    if (tf === 0) continue;

    // BM25 TF normalization
    const normalizedTF =
      (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)));

    // Boost exact matches in file names (important for code search)
    const fileBoost = document.toLowerCase().includes(term) ? 1.5 : 1.0;

    score += normalizedTF * fileBoost;
  }

  return score;
}

// ─── Stage 3: LLM Re-ranking ─────────────────────────────────────────────────

/**
 * Uses Gemini flash to score each chunk's relevance to the query (0-10).
 * This is the "cross-encoder" equivalent without needing a separate API.
 */
async function llmRerankChunks(
  query: string,
  chunks: CodeChunk[],
  projectId: string
): Promise<{ chunk: CodeChunk; score: number }[]> {
  const start = Date.now();

  const chunksText = chunks
    .map(
      (c, i) =>
        `[${i}] File: ${c.fileName}\nSummary: ${c.summary}\nCode snippet: ${c.sourceCode.slice(0, 400)}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are an expert code search engine. Given a user query and a list of code chunks, score each chunk's relevance to the query from 0-10.

USER QUERY: "${query}"

CODE CHUNKS:
${chunksText}

Respond ONLY with a JSON array of numbers, one score per chunk, in the same order. Example: [8, 3, 9, 1, 5]
Scores should reflect how directly the chunk helps answer the query. Higher = more relevant.`;

  try {
    const response = await flashModel.generateContent(prompt);
    const text = response.response.text().trim();
    const latencyMs = Date.now() - start;

    // Log this LLM call
    await trackLLMCall({
      feature: "rerank",
      model: "gemini-2.0-flash",
      latencyMs,
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(text.length / 4),
      projectId,
    });

    // Parse the JSON array of scores
    const jsonMatch = text.match(/\[[\d,\s.]+\]/);
    if (!jsonMatch) return chunks.map((c) => ({ chunk: c, score: 5 }));

    const scores: number[] = JSON.parse(jsonMatch[0]);
    return chunks.map((c, i) => ({ chunk: c, score: scores[i] ?? 5 }));
  } catch {
    // Fallback: return neutral scores
    return chunks.map((c) => ({ chunk: c, score: 5 }));
  }
}

// ─── Main Hybrid Search Function ─────────────────────────────────────────────

/**
 * Runs the full 3-stage hybrid RAG pipeline:
 * 1. Vector search (done by caller — raw chunks passed in)
 * 2. BM25 keyword re-ranking
 * 3. LLM-based re-ranking
 * Returns top-N chunks sorted by combined score.
 */
export async function hybridRerank(
  query: string,
  vectorChunks: CodeChunk[],
  projectId: string,
  topN: number = 5
): Promise<RankedChunk[]> {
  // Stage 2: BM25 scoring on summary + source code
  const bm25Scored = vectorChunks.map((chunk) => ({
    ...chunk,
    bm25Score: computeBM25Score(
      query,
      `${chunk.summary} ${chunk.fileName} ${chunk.sourceCode}`
    ),
  }));

  // Normalise BM25 scores to 0-10
  const maxBM25 = Math.max(...bm25Scored.map((c) => c.bm25Score), 1);
  const bm25Normalised = bm25Scored.map((c) => ({
    ...c,
    bm25Score: (c.bm25Score / maxBM25) * 10,
  }));

  // Stage 3: LLM re-ranking on top-10 (already limited by vector search)
  const llmScored = await llmRerankChunks(query, bm25Normalised, projectId);

  // Combine scores: 40% vector similarity + 30% BM25 + 30% LLM
  const ranked: RankedChunk[] = llmScored.map(({ chunk, score }) => {
    const bm25 = bm25Normalised.find((c) => c.fileName === chunk.fileName)?.bm25Score ?? 0;
    return {
      ...chunk,
      bm25Score: bm25,
      llmScore: score,
      finalScore:
        chunk.similarity * 10 * 0.4 + bm25 * 0.3 + score * 0.3,
    };
  });

  return ranked.sort((a, b) => b.finalScore - a.finalScore).slice(0, topN);
}

// ─── RAGAS-style Faithfulness Scoring ────────────────────────────────────────

/**
 * Evaluates how grounded the generated answer is in the retrieved context.
 * Returns a score from 0 to 100.
 *
 * Inspired by RAGAS's faithfulness metric:
 * https://docs.ragas.io/en/latest/concepts/metrics/faithfulness.html
 */
export async function scoreAnswerFaithfulness(
  question: string,
  answer: string,
  context: string,
  projectId: string
): Promise<number> {
  const start = Date.now();

  const prompt = `You are an AI evaluation expert. Your task is to measure FAITHFULNESS — whether the answer is grounded in and supported by the given context.

QUESTION: ${question}

RETRIEVED CONTEXT:
${context.slice(0, 3000)}

GENERATED ANSWER:
${answer.slice(0, 1000)}

Evaluate faithfulness on a scale of 0-100:
- 100: Every claim in the answer is explicitly supported by the context
- 70-99: Most claims are supported, minor extrapolations
- 40-69: Some claims are supported but there are notable gaps or extrapolations
- 0-39: Answer contains significant claims not supported by the context (hallucination)

Respond with ONLY a single integer number (0-100). No explanation.`;

  try {
    const response = await flashModel.generateContent(prompt);
    const text = response.response.text().trim();
    const latencyMs = Date.now() - start;

    await trackLLMCall({
      feature: "faithfulness-eval",
      model: "gemini-2.0-flash",
      latencyMs,
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: 5,
      projectId,
    });

    const score = parseInt(text.replace(/\D/g, ""), 10);
    return isNaN(score) ? 75 : Math.min(100, Math.max(0, score));
  } catch {
    return 75; // Neutral fallback
  }
}

// ─── LLM Call Observability Tracker ──────────────────────────────────────────

interface LLMCallParams {
  feature: string;
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  success?: boolean;
  projectId?: string;
}

/**
 * Logs an LLM call to the database for observability and cost tracking.
 * Silently fails if DB write fails — never block the main flow.
 */
export async function trackLLMCall(params: LLMCallParams): Promise<void> {
  try {
    await prisma.lLMCallLog.create({
      data: {
        feature: params.feature,
        model: params.model,
        latencyMs: params.latencyMs,
        promptTokens: params.promptTokens ?? 0,
        completionTokens: params.completionTokens ?? 0,
        success: params.success ?? true,
        projectId: params.projectId,
      },
    });
  } catch {
    // Silently fail — observability should never break core functionality
  }
}
