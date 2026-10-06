import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Recall.ai API URL
const RECALL_API_URL = 'https://api.recall.ai/api/v1/bot';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { meetingUrl, projectId, botName = "RepoLens AI Assistant" } = body;

        if (!meetingUrl || !projectId) {
            return NextResponse.json({ error: "Missing meetingUrl or projectId" }, { status: 400 });
        }

        const recallApiKey = process.env.RECALL_API_KEY;
        
        if (!recallApiKey) {
            return NextResponse.json({ error: "Recall API key not configured. Add RECALL_API_KEY to your .env file." }, { status: 500 });
        }

        // 1. Send the bot to the meeting
        const response = await fetch(RECALL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${recallApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meeting_url: meetingUrl,
                bot_name: botName,
                // Pass the projectId in metadata so the webhook knows where to attach this meeting
                metadata: {
                    projectId: projectId
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Recall API Error:", error);
            return NextResponse.json({ error: "Failed to join meeting", details: error }, { status: 500 });
        }

        const data = await response.json();

        // 2. Return success. (We'll create the Meeting record in the DB via the Webhook)
        return NextResponse.json({ 
            success: true, 
            botId: data.id,
            message: "Bot is joining the meeting..."
        }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
