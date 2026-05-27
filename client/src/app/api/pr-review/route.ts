import { NextRequest, NextResponse } from "next/server";
import { runPRReviewAgent } from "@/lib/pr-review-agent";

export const maxDuration = 60; // Allow up to 60s for the agentic pipeline

export async function POST(req: NextRequest) {
    try {
        const { prUrl, projectId } = await req.json();

        if (!prUrl || !projectId) {
            return NextResponse.json(
                { error: "prUrl and projectId are required" },
                { status: 400 }
            );
        }

        // Validate it's a GitHub PR URL
        if (!prUrl.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/)) {
            return NextResponse.json(
                { error: "Invalid GitHub PR URL. Format: https://github.com/owner/repo/pull/123" },
                { status: 400 }
            );
        }

        const result = await runPRReviewAgent(prUrl, projectId);
        return NextResponse.json(result);
    } catch (error) {
        console.error("PR Review Agent error:", error);
        return NextResponse.json(
            { error: "Failed to run PR review agent" },
            { status: 500 }
        );
    }
}
