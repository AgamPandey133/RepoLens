import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { runPRReviewAgent } from "@/lib/pr-review-agent";

// Helper to verify GitHub webhook signatures
function verifyGitHubSignature(req: NextRequest, rawBody: string): boolean {
    const signature = req.headers.get("x-hub-signature-256");
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret || !signature) {
        return false; // In production, you'd want to enforce this
    }

    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        
        // Uncomment to enforce signature validation:
        // if (!verifyGitHubSignature(req, rawBody)) {
        //     return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        // }

        const event = req.headers.get("x-github-event");
        const payload = JSON.parse(rawBody);
        
        const repoUrl = payload.repository?.html_url;
        if (!repoUrl) {
            return NextResponse.json({ error: "No repository URL found" }, { status: 400 });
        }

        // Find the Project in RepoLens
        const project = await prisma.project.findFirst({
            where: { githubUrl: repoUrl }
        });

        if (!project) {
            return NextResponse.json({ message: "Project not found in RepoLens" }, { status: 200 });
        }

        // ─── FEATURE 2: Real-Time Codebase Sync (Push Event) ──────────────
        if (event === "push") {
            console.log(`[Webhook] Push event received for ${repoUrl}`);
            
            // In a full implementation, you would:
            // 1. Extract added/modified/removed files from payload.commits
            // 2. Fetch the raw code for added/modified files via GitHub API
            // 3. Delete old embeddings for modified/removed files from prisma.sourceCodeEmbedding
            // 4. Generate new embeddings using generateEmbeddings() and save them
            
            // Scaffold:
            const commits = payload.commits || [];
            const filesModified = new Set<string>();
            const filesAdded = new Set<string>();
            const filesRemoved = new Set<string>();

            for (const commit of commits) {
                commit.modified.forEach((f: string) => filesModified.add(f));
                commit.added.forEach((f: string) => filesAdded.add(f));
                commit.removed.forEach((f: string) => filesRemoved.add(f));
            }

            console.log("Files to sync:", {
                added: Array.from(filesAdded),
                modified: Array.from(filesModified),
                removed: Array.from(filesRemoved)
            });

            // TODO: Trigger async background job to update these specific files 
            // using lib/github-loader.ts logic
        }

        // ─── FEATURE 1: Automated PR Review Bot ───────────────────────────
        if (event === "pull_request") {
            const action = payload.action;
            const prUrl = payload.pull_request?.html_url;

            // Trigger on opened or synchronize (new commits)
            if (action === "opened" || action === "synchronize") {
                console.log(`[Webhook] PR ${action} event received for ${prUrl}`);
                
                // Trigger the Agent in the background (do not await so GitHub gets a 200 OK fast)
                runPRReviewAgent(prUrl, project.id, true).catch(err => {
                    console.error("Background PR Review Agent failed:", err);
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
