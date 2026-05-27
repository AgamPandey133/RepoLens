"use client"
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { toast } from 'sonner'
import { useProject } from '../ProjectProvider'
import {
    GitPullRequest, Bug, Sparkles, ShieldAlert, Palette,
    ThumbsUp, ChevronDown, ChevronUp, Bot, CheckCircle2,
    Loader2, Clock, Star
} from 'lucide-react'
import type { PRReviewResult, PRReviewSection, AgentStep } from '@/lib/pr-review-agent'

// ─── Category config ──────────────────────────────────────────────────────────
const categoryConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    bug: { icon: <Bug className="w-3.5 h-3.5" />, color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Bug" },
    security: { icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "Security" },
    improvement: { icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "Improvement" },
    style: { icon: <Palette className="w-3.5 h-3.5" />, color: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: "Style" },
    praise: { icon: <ThumbsUp className="w-3.5 h-3.5" />, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Praise" },
}

const severityOrder: Record<string, number> = { critical: 0, major: 1, minor: 2, info: 3 }

// ─── Sub-components ───────────────────────────────────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
    const circumference = 2 * Math.PI * 28
    const dashOffset = circumference * (1 - score / 100)
    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="absolute" width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle cx="40" cy="40" r="28" fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round" transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
            </svg>
            <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
    )
}

const AgentStepList = ({ steps }: { steps: AgentStep[] }) => (
    <div className="space-y-1.5">
        {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
                {step.status === 'done'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    : step.status === 'running'
                        ? <Loader2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0 animate-spin" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 mt-0.5 shrink-0" />
                }
                <div>
                    <span className="text-muted-foreground">{step.step}</span>
                    {step.detail && <span className="ml-1 text-foreground/70">— {step.detail}</span>}
                </div>
            </div>
        ))}
    </div>
)

const ReviewSectionCard = ({ section }: { section: PRReviewSection }) => {
    const [expanded, setExpanded] = useState(false)
    const cfg = categoryConfig[section.category] ?? categoryConfig.improvement
    return (
        <div className="border border-border/60 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
            >
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{section.file.split('/').pop()}</span>
                <span className="text-sm flex-1 line-clamp-1">{section.comment}</span>
                <Badge variant="outline" className="text-xs shrink-0">{section.severity}</Badge>
                {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            {expanded && (
                <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-2">
                    <p className="text-sm text-muted-foreground">{section.comment}</p>
                    {section.suggestion && (
                        <div className="bg-muted/40 rounded p-2">
                            <p className="text-xs text-muted-foreground mb-1 font-medium">💡 Suggestion</p>
                            <pre className="text-xs text-foreground whitespace-pre-wrap">{section.suggestion}</pre>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground/60 font-mono">{section.file}</p>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PRReviewCard = () => {
    const { projectId } = useProject()
    const [prUrl, setPrUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<PRReviewResult | null>(null)

    const handleReview = async () => {
        if (!prUrl.trim() || !projectId) return
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch('/api/pr-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prUrl, projectId }),
            })
            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || 'Failed to run PR review')
                return
            }
            const data: PRReviewResult = await res.json()
            setResult(data)
        } catch {
            toast.error('Failed to run PR review agent')
        } finally {
            setLoading(false)
        }
    }

    const sortedSections = result?.sections
        .slice()
        .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))

    return (
        <Card className="col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <GitPullRequest className="w-5 h-5 text-primary" />
                        Agentic PR Review
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs gap-1">
                        <Bot className="w-3 h-3" />
                        4-step agent · Plan → Retrieve → Review → Reflect
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="https://github.com/owner/repo/pull/123"
                        value={prUrl}
                        onChange={e => setPrUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !loading && handleReview()}
                        className="font-mono text-sm"
                    />
                    <Button onClick={handleReview} disabled={loading || !prUrl.trim()}>
                        {loading
                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...</>
                            : 'Review PR'}
                    </Button>
                </div>

                {/* Agent Steps (visible while loading or after) */}
                {loading && (
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-primary" /> Agent pipeline running...
                        </p>
                        <div className="space-y-1.5">
                            {['Planning: Fetching PR files from GitHub', 'Retrieving: Running hybrid RAG search', 'Reviewing: Generating structured review', 'Reflecting: Verifying for hallucinations'].map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-3 h-3 animate-spin" /> {s}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        {/* Agent steps trace */}
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <p className="text-xs font-medium mb-2 flex items-center gap-1">
                                <Bot className="w-3.5 h-3.5 text-primary" /> Agent execution trace
                            </p>
                            <AgentStepList steps={result.agentSteps} />
                        </div>

                        {/* Score + summary */}
                        <div className="flex items-start gap-4 p-4 rounded-lg border border-border/60 bg-muted/20">
                            <ScoreRing score={result.overallScore} />
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm">Overall Score</p>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" /> {(result.latencyMs / 1000).toFixed(1)}s
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        · {result.retrievedFiles.length} files retrieved via RAG
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{result.summary}</p>
                            </div>
                        </div>

                        {/* Review sections */}
                        {sortedSections && sortedSections.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {sortedSections.length} Review Comments
                                </p>
                                {sortedSections.map((section, i) => (
                                    <ReviewSectionCard key={i} section={section} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-emerald-400 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Star className="w-4 h-4" /> No issues found — looks great!
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default PRReviewCard
