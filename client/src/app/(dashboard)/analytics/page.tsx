"use client"
import React, { useEffect, useState } from 'react'
import { useProject } from '@/components/ProjectProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
    Zap, ShieldCheck, DollarSign, Activity, Clock,
    Cpu, TrendingUp, MessageSquare, CheckCircle2, BarChart2
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsData {
    overview: {
        totalCalls: number
        avgLatencyMs: number
        successRate: number
        totalTokens: number
        estimatedCostUSD: number
    }
    featureBreakdown: {
        feature: string
        callCount: number
        avgLatencyMs: number
        totalTokens: number
        estimatedCostUSD: number
    }[]
    dailyVolume: { date: string; calls: number }[]
    ragQuality: {
        avgFaithfulness: number
        avgRagLatency: number
        totalEvaluations: number
        faithfulnessTrend: { index: number; score: number; date: string }[]
    }
    topQuestions: { question: string; date: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StatCard = ({
    title, value, subtitle, icon, color = 'text-primary'
}: {
    title: string; value: string | number; subtitle?: string
    icon: React.ReactNode; color?: string
}) => (
    <Card>
        <CardContent className="p-5">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
                <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>{icon}</div>
            </div>
        </CardContent>
    </Card>
)

const FaithfulnessGauge = ({ score }: { score: number }) => {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
    const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work'
    const circumference = 2 * Math.PI * 40
    const dashOffset = circumference * (1 - score / 100)

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
                <svg width="112" height="112" viewBox="0 0 112 112" className="absolute">
                    <circle cx="56" cy="56" r="40" fill="none" stroke="currentColor"
                        strokeWidth="8" className="text-muted/30" />
                    <circle cx="56" cy="56" r="40" fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        strokeLinecap="round" transform="rotate(-90 56 56)"
                        style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                </svg>
                <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color }}>{score}</p>
                    <p className="text-xs text-muted-foreground">/100</p>
                </div>
            </div>
            <Badge variant="outline" style={{ borderColor: color, color }} className="text-xs">
                {label}
            </Badge>
        </div>
    )
}

const FEATURE_COLORS: Record<string, string> = {
    'ask-question': '#6366f1',
    'rerank': '#8b5cf6',
    'faithfulness-eval': '#06b6d4',
    'pr-review': '#f59e0b',
    'pr-review-reflect': '#ef4444',
    'commit-summary': '#10b981',
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                <p className="font-medium mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
                ))}
            </div>
        )
    }
    return null
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const { projectId } = useProject()
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const url = projectId ? `/api/analytics?projectId=${projectId}` : '/api/analytics'
        fetch(url)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [projectId])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
                    <p className="text-muted-foreground text-sm">Loading analytics...</p>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Failed to load analytics.
            </div>
        )
    }

    const { overview, featureBreakdown, dailyVolume, ragQuality, topQuestions } = data

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart2 className="w-8 h-8 text-primary" />
                        AI Observability
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Real-time monitoring of your LLM pipeline — latency, token usage, RAG quality, and cost
                    </p>
                </div>
                <Badge variant="secondary" className="gap-1 text-xs">
                    <Activity className="w-3 h-3" /> Live
                </Badge>
            </div>

            {/* Overview stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total LLM Calls"
                    value={overview.totalCalls.toLocaleString()}
                    subtitle="across all features"
                    icon={<Cpu className="w-5 h-5" />}
                    color="text-indigo-400"
                />
                <StatCard
                    title="Avg Latency"
                    value={`${(overview.avgLatencyMs / 1000).toFixed(1)}s`}
                    subtitle="per LLM call"
                    icon={<Clock className="w-5 h-5" />}
                    color="text-yellow-400"
                />
                <StatCard
                    title="Success Rate"
                    value={`${overview.successRate}%`}
                    subtitle={`${overview.totalCalls} total calls`}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    color="text-emerald-400"
                />
                <StatCard
                    title="Est. API Cost"
                    value={`$${overview.estimatedCostUSD}`}
                    subtitle={`${(overview.totalTokens / 1000).toFixed(0)}K tokens used`}
                    icon={<DollarSign className="w-5 h-5" />}
                    color="text-cyan-400"
                />
            </div>

            {/* RAG Quality + Faithfulness trend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Faithfulness gauge */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            RAG Faithfulness Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center gap-3 pb-6">
                        <FaithfulnessGauge score={ragQuality.avgFaithfulness || 0} />
                        <div className="grid grid-cols-2 gap-4 w-full mt-2 text-center">
                            <div>
                                <p className="text-2xl font-bold text-purple-400">{(ragQuality.avgRagLatency / 1000).toFixed(1)}s</p>
                                <p className="text-xs text-muted-foreground">Avg RAG latency</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-400">{ragQuality.totalEvaluations}</p>
                                <p className="text-xs text-muted-foreground">Evaluations run</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Faithfulness trend line */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            Faithfulness Score Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ragQuality.faithfulnessTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={160}>
                                <AreaChart data={ragQuality.faithfulnessTrend}>
                                    <defs>
                                        <linearGradient id="faithGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="index" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="score" name="Faithfulness"
                                        stroke="#10b981" fill="url(#faithGrad)" strokeWidth={2} dot={{ r: 3 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                                Ask some questions to see your RAG faithfulness trend
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily volume + Feature breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Daily call volume */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            Daily LLM Call Volume (14 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dailyVolume.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={dailyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.2)"
                                        tickFormatter={d => d.slice(5)} />
                                    <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="calls" name="API Calls" radius={[4, 4, 0, 0]}>
                                        {dailyVolume.map((_, i) => (
                                            <Cell key={i} fill={`hsl(${240 + i * 4}, 70%, 60%)`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                                No data yet — start using the app!
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Feature breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            Feature Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {featureBreakdown.length > 0 ? (
                            <div className="space-y-3">
                                {featureBreakdown.sort((a, b) => b.callCount - a.callCount).map((f) => (
                                    <div key={f.feature} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-mono font-medium" style={{ color: FEATURE_COLORS[f.feature] ?? '#94a3b8' }}>
                                                {f.feature}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {f.callCount} calls · {(f.avgLatencyMs / 1000).toFixed(1)}s avg
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${Math.min(100, (f.callCount / (featureBreakdown[0]?.callCount || 1)) * 100)}%`,
                                                    background: FEATURE_COLORS[f.feature] ?? '#6366f1'
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                                No feature data yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Latency per feature bar chart */}
            {featureBreakdown.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            Average Latency by Feature (ms)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={featureBreakdown} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                                <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.2)" width={130} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="avgLatencyMs" name="Avg Latency (ms)" radius={[0, 4, 4, 0]}>
                                    {featureBreakdown.map((f) => (
                                        <Cell key={f.feature} fill={FEATURE_COLORS[f.feature] ?? '#6366f1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Top Questions */}
            {topQuestions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-cyan-400" />
                            Recent Questions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {topQuestions.map((q, i) => (
                                <div key={i} className="flex items-start justify-between gap-4 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                    <p className="text-sm flex-1 line-clamp-1">{q.question}</p>
                                    <span className="text-xs text-muted-foreground shrink-0">{q.date}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
