/**
 * pr-review-agent.ts
 *
 * Multi-step Agentic PR Review Pipeline for RepoLens.
 *
 * This agent autonomously:
 *   Step 1 — PLAN:     Parse the PR diff to identify changed files & scope
 *   Step 2 — RETRIEVE: Run hybrid RAG search for each changed file
 *   Step 3 — REVIEW:   Generate a structured code review
 *   Step 4 — REFLECT:  Verify the review is grounded in retrieved context
 *
 * This demonstrates agentic AI patterns (plan → act → reflect) which is
 * a key skill for AI engineering roles.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "./gemini";
import { hybridRerank, trackLLMCall, type CodeChunk } from "./rag-pipeline";
import prisma from "./prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PRFile {
    filename: string;
    status: "added" | "modified" | "removed" | "renamed";
    additions: number;
    deletions: number;
    patch?: string;
}

export interface PRReviewSection {
    category: "bug" | "improvement" | "security" | "style" | "praise";
    severity: "critical" | "major" | "minor" | "info";
    file: string;
    comment: string;
    suggestion?: string;
}

export interface AgentStep {
    step: string;
    status: "running" | "done" | "skipped";
    detail?: string;
}

export interface PRReviewResult {
    summary: string;
    sections: PRReviewSection[];
    overallScore: number;     // 0-100
    agentSteps: AgentStep[];
    retrievedFiles: string[];
    latencyMs: number;
}

// ─── Step 1: PLAN — Parse PR via GitHub API ───────────────────────────────────

async function fetchPRFiles(prUrl: string): Promise<PRFile[]> {
    // Convert https://github.com/owner/repo/pull/N  →  API format
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) throw new Error("Invalid GitHub PR URL");

    const [, owner, repo, pullNumber] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`;

    const response = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
        },
    });

    if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

    const files = await response.json();
    return files.map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch?.slice(0, 2000), // limit patch size
    }));
}

// ─── Step 2: RETRIEVE — Hybrid RAG for each changed file ─────────────────────

async function retrieveContextForFiles(
    files: PRFile[],
    projectId: string
): Promise<Map<string, CodeChunk[]>> {
    const contextMap = new Map<string, CodeChunk[]>();

    for (const file of files.slice(0, 5)) { // limit to 5 files for cost control
        if (file.status === "removed") continue;

        const query = `${file.filename} ${file.patch || ""}`;

        // Vector search from DB
        const queryVector = await generateEmbedding(query.slice(0, 500));
        const vectorQuery = `[${queryVector.join(",")}]`;

        const rawResults = await prisma.$queryRaw`
            SELECT "fileName", "sourceCode", "summary",
            1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS "similarity"
            FROM "SourceCodeEmbedding"
            WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.3
            AND "projectId" = ${projectId}
            ORDER BY "similarity" DESC
            LIMIT 8
        ` as CodeChunk[];

        if (rawResults.length > 0) {
            const ranked = await hybridRerank(query, rawResults, projectId, 3);
            contextMap.set(file.filename, ranked);
        }
    }

    return contextMap;
}

// ─── Step 3: REVIEW — Generate structured review ─────────────────────────────

async function generateReview(
    files: PRFile[],
    contextMap: Map<string, CodeChunk[]>,
    projectId: string
): Promise<{ summary: string; sections: PRReviewSection[]; score: number }> {
    const start = Date.now();

    // Build context string from retrieved chunks
    let contextStr = "";
    for (const [filename, chunks] of contextMap.entries()) {
        contextStr += `\n### Related code for ${filename}:\n`;
        for (const chunk of chunks) {
            contextStr += `- ${chunk.fileName}: ${chunk.summary}\n`;
        }
    }

    // Build diff summary
    const diffSummary = files
        .map(f => `- ${f.status.toUpperCase()}: ${f.filename} (+${f.additions}/-${f.deletions})\n${f.patch ? `\`\`\`diff\n${f.patch}\n\`\`\`` : ""}`)
        .join("\n\n");

    const prompt = `You are an expert senior software engineer performing an AI-powered code review.

## Changed Files in this PR:
${diffSummary}

## Related Codebase Context (from RAG retrieval):
${contextStr || "No related context found."}

## Your Task:
Provide a comprehensive code review. Return a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence overall PR summary",
  "overallScore": <integer 0-100>,
  "sections": [
    {
      "category": "<bug|improvement|security|style|praise>",
      "severity": "<critical|major|minor|info>",
      "file": "<filename>",
      "comment": "<specific actionable comment>",
      "suggestion": "<optional code suggestion>"
    }
  ]
}

Guidelines:
- Be specific and reference exact file names and line patterns from the diff
- Critical bugs or security issues should always be flagged
- Praise genuinely good patterns
- Score: 90-100=excellent, 70-89=good, 50-69=needs work, <50=significant issues
- Return ONLY the JSON, no markdown wrapping`;

    const response = await flashModel.generateContent(prompt);
    const text = response.response.text().trim();
    const latencyMs = Date.now() - start;

    await trackLLMCall({
        feature: "pr-review",
        model: "gemini-2.0-flash",
        latencyMs,
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(text.length / 4),
        projectId,
    });

    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            summary: parsed.summary || "Review completed.",
            sections: parsed.sections || [],
            score: parsed.overallScore ?? 70,
        };
    } catch {
        return {
            summary: text.slice(0, 300),
            sections: [],
            score: 70,
        };
    }
}

// ─── Step 4: REFLECT — Verify review isn't hallucinating ─────────────────────

async function reflectOnReview(
    review: { summary: string; sections: PRReviewSection[] },
    files: PRFile[],
    projectId: string
): Promise<PRReviewSection[]> {
    if (review.sections.length === 0) return [];

    const start = Date.now();
    const reviewText = review.sections
        .map(s => `[${s.file}] ${s.comment}`)
        .join("\n");

    const fileNames = files.map(f => f.filename).join(", ");

    const prompt = `You are a QA agent verifying an AI-generated code review.

Changed files in the PR: ${fileNames}

Review comments:
${reviewText}

Check each comment:
1. Does it reference a real file that was changed? (not hallucinated)
2. Is it specific enough to be actionable?

Return a JSON array of indices (0-based) of comments that are VALID and should be KEPT.
Example: [0, 1, 3] means keep the 1st, 2nd, and 4th comments.
Return ONLY the JSON array.`;

    try {
        const response = await flashModel.generateContent(prompt);
        const text = response.response.text().trim();
        const latencyMs = Date.now() - start;

        await trackLLMCall({
            feature: "pr-review-reflect",
            model: "gemini-2.0-flash",
            latencyMs,
            promptTokens: Math.ceil(prompt.length / 4),
            completionTokens: Math.ceil(text.length / 4),
            projectId,
        });

        const jsonMatch = text.match(/\[[\d,\s]*\]/);
        if (!jsonMatch) return review.sections;

        const validIndices: number[] = JSON.parse(jsonMatch[0]);
        return review.sections.filter((_, i) => validIndices.includes(i));
    } catch {
        return review.sections; // Return all if reflection fails
    }
}

// ─── Main Agent Entry Point ───────────────────────────────────────────────────

/**
 * Runs the full 4-step Agentic PR Review pipeline.
 * Each step is logged as an AgentStep for transparency in the UI.
 */
export async function runPRReviewAgent(
    prUrl: string,
    projectId: string
): Promise<PRReviewResult> {
    const totalStart = Date.now();
    const agentSteps: AgentStep[] = [];

    // ── Step 1: PLAN ────────────────────────────────────────────────────────
    agentSteps.push({ step: "Planning: Fetching PR files from GitHub", status: "running" });
    let files: PRFile[] = [];
    try {
        files = await fetchPRFiles(prUrl);
        agentSteps[0].status = "done";
        agentSteps[0].detail = `Found ${files.length} changed files`;
    } catch (err) {
        agentSteps[0].status = "skipped";
        agentSteps[0].detail = `GitHub fetch failed: ${err}`;
        return {
            summary: "Could not fetch PR files. Please check the PR URL and ensure the repository is accessible.",
            sections: [],
            overallScore: 0,
            agentSteps,
            retrievedFiles: [],
            latencyMs: Date.now() - totalStart,
        };
    }

    // ── Step 2: RETRIEVE ────────────────────────────────────────────────────
    agentSteps.push({ step: "Retrieving: Running hybrid RAG search for changed files", status: "running" });
    const contextMap = await retrieveContextForFiles(files, projectId);
    const retrievedFiles = Array.from(contextMap.keys());
    agentSteps[1].status = "done";
    agentSteps[1].detail = `Retrieved context for ${retrievedFiles.length} files`;

    // ── Step 3: REVIEW ──────────────────────────────────────────────────────
    agentSteps.push({ step: "Reviewing: Generating structured code review with Gemini", status: "running" });
    const rawReview = await generateReview(files, contextMap, projectId);
    agentSteps[2].status = "done";
    agentSteps[2].detail = `Generated ${rawReview.sections.length} review comments`;

    // ── Step 4: REFLECT ─────────────────────────────────────────────────────
    agentSteps.push({ step: "Reflecting: Verifying review for hallucinations", status: "running" });
    const verifiedSections = await reflectOnReview(rawReview, files, projectId);
    const removedCount = rawReview.sections.length - verifiedSections.length;
    agentSteps[3].status = "done";
    agentSteps[3].detail = `Removed ${removedCount} hallucinated comment(s)`;

    return {
        summary: rawReview.summary,
        sections: verifiedSections,
        overallScore: rawReview.score,
        agentSteps,
        retrievedFiles,
        latencyMs: Date.now() - totalStart,
    };
}
