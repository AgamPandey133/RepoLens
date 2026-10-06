import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Recall.ai sends events like 'bot.status_change'
        const event = body.event;
        const botData = body.data;

        // When the bot leaves the meeting and the video is processed, status becomes 'done'
        if (event === 'bot.status_change' && botData.status === 'done') {
            const videoUrl = botData.video_url; // Recall provides a video/audio download link
            const projectId = botData.metadata?.projectId;

            if (projectId && videoUrl) {
                // 1. Create a placeholder meeting in our database
                const meeting = await prisma.meeting.create({
                    data: {
                        name: 'Live Meeting Recording',
                        meetingUrl: videoUrl,
                        projectId: projectId,
                        status: 'PROCESSING'
                    }
                });

                // 2. Call our internal endpoint to trigger AssemblyAI and Gemini
                // We use an internal fetch to /api/process-meeting to reuse existing logic
                // NOTE: We intentionally DO NOT await this fetch so the webhook can respond 200 OK to Recall immediately
                fetch(new URL('/api/process-meeting', req.url).toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        meetingUrl: { url: videoUrl },
                        projectId: projectId,
                        meetingId: meeting.id
                    })
                }).catch(err => console.error("Error triggering meeting processing:", err));
            }
        }

        // Always acknowledge the webhook quickly
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
        console.error("Webhook error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
