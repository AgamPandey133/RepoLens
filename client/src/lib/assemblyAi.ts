// Start by making sure the `assemblyai` package is installed.
// If not, you can install it by running the following command:
// npm install assemblyai

import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLY_API_KEY || '',
});

// const FILE_URL =
//   'https://assembly.ai/sports_injuries.mp3';

function msToTime(ms: number) {
    const seconds = ms / 1000
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const processMeeting = async (meetingUrl: string) => {

    const transcript = await client.transcripts.transcribe({
        audio: meetingUrl,
        auto_chapters: true,
        speaker_labels: true,
    })

    const summaries = transcript.chapters?.map(chapter => ({
        start: msToTime(chapter.start),
        end: msToTime(chapter.end),
        gist: chapter.gist,
        headline: chapter.headline,
        summary: chapter.summary
    })) || []
    
    const utterances = transcript.utterances?.map(utterance => ({
        speaker: `Speaker ${utterance.speaker}`,
        text: utterance.text,
        start: msToTime(utterance.start),
        end: msToTime(utterance.end)
    })) || []

    if (!transcript.text) throw new Error('No transcript found')

    return {
        summaries,
        utterances,
        transcriptUrl: transcript.id, // Can be useful for debugging
    }
}