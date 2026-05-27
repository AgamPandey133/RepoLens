import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        // ── LLM Call Stats ───────────────────────────────────────────────────
        const llmLogs = await prisma.lLMCallLog.findMany({
            where: projectId ? { projectId } : {},
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        // Aggregate by feature
        const featureStats: Record<string, { count: number; totalLatency: number; totalTokens: number }> = {};
        for (const log of llmLogs) {
            if (!featureStats[log.feature]) {
                featureStats[log.feature] = { count: 0, totalLatency: 0, totalTokens: 0 };
            }
            featureStats[log.feature].count++;
            featureStats[log.feature].totalLatency += log.latencyMs;
            featureStats[log.feature].totalTokens += log.promptTokens + log.completionTokens;
        }

        const featureBreakdown = Object.entries(featureStats).map(([feature, stats]) => ({
            feature,
            callCount: stats.count,
            avgLatencyMs: Math.round(stats.totalLatency / stats.count),
            totalTokens: stats.totalTokens,
            // Rough cost estimate: $0.0001 per 1K tokens (gemini-flash pricing)
            estimatedCostUSD: parseFloat(((stats.totalTokens / 1000) * 0.0001).toFixed(4)),
        }));

        // Daily call volume for the last 14 days
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const recentLogs = llmLogs.filter(l => l.createdAt >= fourteenDaysAgo);
        const dailyVolume: Record<string, number> = {};
        for (const log of recentLogs) {
            const day = log.createdAt.toISOString().split("T")[0];
            dailyVolume[day] = (dailyVolume[day] || 0) + 1;
        }
        const dailyVolumeArr = Object.entries(dailyVolume)
            .map(([date, calls]) => ({ date, calls }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Overall stats
        const totalCalls = llmLogs.length;
        const avgLatencyMs = totalCalls > 0
            ? Math.round(llmLogs.reduce((sum, l) => sum + l.latencyMs, 0) / totalCalls)
            : 0;
        const successRate = totalCalls > 0
            ? Math.round((llmLogs.filter(l => l.success).length / totalCalls) * 100)
            : 100;
        const totalTokens = llmLogs.reduce((sum, l) => sum + l.promptTokens + l.completionTokens, 0);

        // ── RAG Evaluation Stats ─────────────────────────────────────────────
        const ragEvals = await prisma.rAGEvaluation.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
        });

        const avgFaithfulness = ragEvals.length > 0
            ? Math.round(ragEvals.reduce((sum, e) => sum + e.faithfulnessScore, 0) / ragEvals.length)
            : 0;
        const avgRagLatency = ragEvals.length > 0
            ? Math.round(ragEvals.reduce((sum, e) => sum + e.ragLatencyMs, 0) / ragEvals.length)
            : 0;

        // Faithfulness trend (last 10 evaluations)
        const faithfulnessTrend = ragEvals.slice(0, 10).reverse().map((e, i) => ({
            index: i + 1,
            score: e.faithfulnessScore,
            date: e.createdAt.toISOString().split("T")[0],
        }));

        // ── Top Questions ────────────────────────────────────────────────────
        const topQuestions = await prisma.question.findMany({
            where: projectId ? { projectId } : {},
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { question: true, createdAt: true },
        });

        return NextResponse.json({
            overview: {
                totalCalls,
                avgLatencyMs,
                successRate,
                totalTokens,
                estimatedCostUSD: parseFloat(((totalTokens / 1000) * 0.0001).toFixed(4)),
            },
            featureBreakdown,
            dailyVolume: dailyVolumeArr,
            ragQuality: {
                avgFaithfulness,
                avgRagLatency,
                totalEvaluations: ragEvals.length,
                faithfulnessTrend,
            },
            topQuestions: topQuestions.map(q => ({
                question: q.question,
                date: q.createdAt.toISOString().split("T")[0],
            })),
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
