import { NextRequest, NextResponse } from "next/server";
import { runArchitectAgent } from "@/lib/architect-agent";

export const maxDuration = 60; // Allow up to 60s for agentic pipeline

export async function POST(req: NextRequest) {
    try {
        const { prompt, projectId } = await req.json();

        if (!prompt || !projectId) {
            return NextResponse.json(
                { error: "prompt and projectId are required" },
                { status: 400 }
            );
        }

        const plan = await runArchitectAgent(prompt, projectId);
        return NextResponse.json(plan);
    } catch (error) {
        console.error("Architect Agent error:", error);
        return NextResponse.json(
            { error: "Failed to run Architect agent" },
            { status: 500 }
        );
    }
}
