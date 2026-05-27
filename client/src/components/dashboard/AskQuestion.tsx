"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'
import { useTheme } from 'next-themes'
import { askQuestion } from './action'
import useRefetch from '@/hooks/use-refetch'
import MarkdownPreview from '@uiw/react-markdown-preview';
import CodeRefrence from './code-refrence'
import { useSaveAnswer } from '@/hooks/use-save-answer'
import { useProject } from '../ProjectProvider'
import { useAuth } from '../AuthProvider'
import { Badge } from '../ui/badge'
import { Zap, ShieldCheck, Layers, Clock } from 'lucide-react'

interface RAGStats {
    faithfulnessScore: number
    ragLatencyMs: number
    topSimilarity: number
    chunksRetrieved: number
}

const FaithfulnessBadge = ({ score }: { score: number }) => {
    const color =
        score >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
        score >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
        'bg-red-500/20 text-red-400 border-red-500/30'

    const label =
        score >= 80 ? 'High Confidence' :
        score >= 60 ? 'Medium Confidence' :
        'Low Confidence'

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
            <ShieldCheck className="w-3 h-3" />
            {label} ({score}/100)
        </span>
    )
}

const RAGStatsBar = ({ stats }: { stats: RAGStats }) => (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-medium text-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <FaithfulnessBadge score={stats.faithfulnessScore} />
        </span>
        <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            {stats.chunksRetrieved} context chunks
        </span>
        <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            {stats.topSimilarity}% top similarity
        </span>
        <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            {(stats.ragLatencyMs / 1000).toFixed(1)}s RAG latency
        </span>
    </div>
)

const AskQuestionCard = () => {
    const { projectId } = useProject();
    const { user } = useAuth();
    const userId = user?.id;
    const theme = useTheme();
    const [question, setQuestion] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [filesReferences, setFilesReferences] = useState<{ fileName: string, sourceCode: string, summary: string }[]>([])
    const [answer, setAnswer] = useState('')
    const [ragStats, setRagStats] = useState<RAGStats | null>(null)

    const saveAnswer = useSaveAnswer();
    const refetch = useRefetch();

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setAnswer('')
        setFilesReferences([])
        setRagStats(null)

        if (!projectId) return
        setLoading(true)

        try {
            const { output, filesRefrences, faithfulnessScore, ragLatencyMs, topSimilarity, chunksRetrieved } = await askQuestion(question, projectId)
            setOpen(true)
            setFilesReferences(filesRefrences)
            setAnswer(output)
            setRagStats({ faithfulnessScore, ragLatencyMs, topSimilarity, chunksRetrieved })
        } catch (err) {
            toast.error("Failed to fetch answer")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[73vw]">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle>
                                <div className='flex items-center gap-2'>
                                    <h1 className='text-2xl font-bold'>RepoLens</h1>
                                </div>
                            </DialogTitle>

                            <Button
                                variant={'outline'}
                                disabled={saveAnswer.isPending}
                                onClick={() => {
                                    if (!userId) {
                                        toast.error("User ID missing")
                                        return
                                    }

                                    saveAnswer.mutate(
                                        {
                                            projectId,
                                            question,
                                            answer,
                                            filesRefrences: filesReferences,
                                            userId,
                                        },
                                        {
                                            onSuccess: () => {
                                                toast.success('Answer saved successfully')
                                                refetch();
                                            },
                                            onError: () => {
                                                toast.error("Failed to save answer");
                                            },
                                        }
                                    )
                                }}
                            >
                                {saveAnswer.isPending ? "Saving..." : "Save Answer"}
                            </Button>
                        </div>

                        {/* RAG Quality Stats Bar */}
                        {ragStats && (
                            <div className="mt-2">
                                <RAGStatsBar stats={ragStats} />
                            </div>
                        )}
                    </DialogHeader>

                    <MarkdownPreview
                        source={answer}
                        className='max-w-[70vw] h-full max-h-[30vh] overflow-scroll -mt-2'
                        style={{ padding: '1rem', background: 'transparent' }}
                        wrapperElement={{
                            "data-color-mode": theme.theme === 'dark' ? 'dark' : 'light',
                        }}
                    />

                    <CodeRefrence filesRefrences={filesReferences} />

                    <button
                        type='button'
                        onClick={() => { setOpen(false) }}
                        className='border rounded-md py-2 -mt-3 bg-primary/40'
                    >
                        Close
                    </button>
                </DialogContent>
            </Dialog>

            <Card className='relative col-span-3'>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Ask a question</CardTitle>
                        <Badge variant="secondary" className="text-xs gap-1">
                            <Zap className="w-3 h-3" />
                            Hybrid RAG · 3-stage pipeline
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <Textarea
                            className='h-28'
                            placeholder='Which file should I edit to change the home page?'
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                        />
                        <div className="h-4"></div>
                        <Button type='submit' disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Running hybrid search...
                                </span>
                            ) : 'Ask RepoLens!'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </>
    )
}

export default AskQuestionCard
