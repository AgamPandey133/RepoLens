"use server"

import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateEmbedding } from "@/lib/gemini"
import prisma from "@/lib/prisma"
import {
    hybridRerank,
    scoreAnswerFaithfulness,
    trackLLMCall,
    type CodeChunk,
    type RankedChunk,
} from "@/lib/rag-pipeline"

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
})

export async function askQuestion(question: string, projectId: string) {
    const ragStart = Date.now();

    // ── Stage 1: Vector Search (top-20 candidates) ─────────────────────────
    const queryVector = await generateEmbedding(question)
    const vectorQuery = `[${queryVector.join(",")}]`

    const rawResults = await prisma.$queryRaw`
    SELECT "fileName", "sourceCode", "summary",
    1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS "similarity"
    FROM "SourceCodeEmbedding"
    WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.4
    AND "projectId" = ${projectId}
    ORDER BY "similarity" DESC
    LIMIT 20
  ` as CodeChunk[]

    // ── Stage 2 & 3: BM25 + LLM Hybrid Re-ranking (top-5 results) ─────────
    const rankedChunks: RankedChunk[] = rawResults.length > 0
        ? await hybridRerank(question, rawResults, projectId, 5)
        : []

    const topSimilarity = rankedChunks[0]?.similarity ?? 0

    // Build context string for the LLM from ranked chunks
    let context = ""
    for (const doc of rankedChunks) {
        context += `source: ${doc.fileName}\n code content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`
    }

    // ── LLM Answer Generation ──────────────────────────────────────────────
    const llmStart = Date.now();
    const { textStream } = await streamText({
        model: google("gemini-2.0-flash"),
        prompt: `
You are an expert AI code assistant for the RepoLens platform. You help developers understand their codebase.

INSTRUCTIONS:
- Answer using ONLY the information provided in the context below
- Be precise and technical — your audience is a software engineer
- Reference specific file names when relevant
- If the context does not contain enough information, say so clearly

START CONTEXT BLOCK
${context || "No relevant code found for this query."}
END OF CONTEXT BLOCK

START QUESTION
${question}
END OF QUESTION

Answer in markdown syntax with inline code snippets where helpful.
    `,
    })

    let output = ""
    for await (const delta of textStream) {
        output += delta
    }

    const llmLatencyMs = Date.now() - llmStart;

    // Track the main LLM call
    await trackLLMCall({
        feature: "ask-question",
        model: "gemini-2.0-flash",
        latencyMs: llmLatencyMs,
        promptTokens: Math.ceil(context.length / 4),
        completionTokens: Math.ceil(output.length / 4),
        projectId,
    });

    // ── Faithfulness Evaluation (async — runs in background) ───────────────
    const ragLatencyMs = Date.now() - ragStart;
    const faithfulnessScore = await scoreAnswerFaithfulness(
        question,
        output,
        context,
        projectId
    );

    return {
        output,
        filesRefrences: rankedChunks,
        faithfulnessScore,
        ragLatencyMs,
        topSimilarity: Math.round(topSimilarity * 100),
        chunksRetrieved: rankedChunks.length,
    }
}
