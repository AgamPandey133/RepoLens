import { processMeeting } from "@/lib/assemblyAi";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { extractMeetingIssues } from "@/lib/gemini";


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { meetingUrl, projectId, meetingId } = body;
        const { summaries, utterances, transcriptUrl } = await processMeeting(meetingUrl.url);
        
        let issues = summaries.map(summary => ({
            start: summary.start,
            end: summary.end,
            gist: summary.gist,
            headline: summary.headline,
            summary: summary.summary,
            speaker: "Unknown",
            solution: "N/A"
        }));

        if (utterances && utterances.length > 0) {
            const extractedIssues = await extractMeetingIssues(utterances);
            if (extractedIssues && extractedIssues.length > 0) {
                issues = extractedIssues.map((issue: any) => ({
                    start: issue.start || "00:00",
                    end: issue.end || "00:00",
                    gist: issue.gist || "Topic",
                    headline: issue.headline || "Issue",
                    summary: issue.summary || "",
                    speaker: issue.speaker || "Unknown",
                    solution: issue.solution || "None"
                }));
            }
        }

        await prisma.issue.createMany({
            data: issues.map(issue => ({
                ...issue,
                meetingId,
            })),
        });

        await prisma.meeting.update({
            where: {
                id: meetingId,
            },
            data: {
                status: 'COMPLETED',
                name: issues[0] ? issues[0].headline : 'Default',
                transcript: utterances as any,
            },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}