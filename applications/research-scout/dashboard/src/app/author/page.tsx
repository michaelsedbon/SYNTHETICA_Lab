"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

interface AuthorProfile {
    author: {
        id: string;
        name: string;
        affiliation: string | null;
        country: string | null;
        misfit_score: number | null;
        source: string;
    };
    papers: Array<{
        id: string;
        title: string;
        year: number | null;
        citation_count: number;
        venue: string | null;
        doi: string | null;
        url: string | null;
        topics: string | null;
    }>;
    coauthors: Array<{
        id: string;
        name: string;
        affiliation: string | null;
        shared_papers: number;
    }>;
    topics: Array<{ topic_name: string; paper_count: number }>;
    timeline: Array<{ year: number; count: number }>;
}

const TOPIC_COLORS: Record<string, string> = {
    "Synthetic Biology × Robotics": "#6366f1",
    "BioArt & Living Design": "#ec4899",
    "AI for Wetlab": "#10b981",
    "DIYBio & Maker Biotech": "#f59e0b",
    "Soft Robotics × Biology": "#8b5cf6",
    "Xenobots & Living Machines": "#ef4444",
    "Bioluminescence Engineering": "#22d3ee",
    "Organoid Intelligence & Biocomputing": "#14b8a6",
    "Living Materials & Engineered Organisms": "#f97316",
    "Genetic Circuit × Physical World": "#a3e635",
};

export default function AuthorProfilePage() {
    const searchParams = useSearchParams();
    const authorId = searchParams.get("id");
    const [profile, setProfile] = React.useState<AuthorProfile | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!authorId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        fetch(`http://localhost:8002/api/authors/${encodeURIComponent(authorId)}`)
            .then((res) => {
                if (!res.ok) throw new Error("Author not found");
                return res.json();
            })
            .then((data) => {
                setProfile(data);
                setLoading(false);
            })
            .catch((e) => {
                setError(String(e));
                setLoading(false);
            });
    }, [authorId]);

    if (!authorId) {
        return (
            <div className="flex flex-col items-center gap-3 px-8 py-20 text-[var(--muted)]">
                <span className="text-4xl">🧑‍🔬</span>
                <p>No author selected. Click on an author from the People page.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-8 py-20 text-[var(--muted)]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                Loading profile…
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="px-8 py-20 text-red-400">
                Author not found: {error}
            </div>
        );
    }

    const { author, papers, coauthors, topics, timeline } = profile;
    const maxTimelineCount = Math.max(...timeline.map((t) => t.count), 1);

    return (
        <div className="px-8 py-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{author.name}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                    {author.affiliation && <span>🏛️ {author.affiliation}</span>}
                    {author.country && <span>🌍 {author.country}</span>}
                    {author.misfit_score != null && author.misfit_score > 0 && (
                        <span className="text-amber-400">🎯 Misfit: {author.misfit_score.toFixed(0)}</span>
                    )}
                    <a
                        href={`https://scholar.google.com/scholar?q=author:"${encodeURIComponent(author.name)}"`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-0.5 text-xs text-[var(--muted)] transition-all hover:border-indigo-500/30 hover:text-indigo-400"
                    >
                        🎓 Google Scholar
                    </a>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Topics */}
                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
                        Topics
                    </h2>
                    <div className="space-y-2">
                        {topics.map((t) => (
                            <div key={t.topic_name} className="flex items-center justify-between">
                                <span
                                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                    style={{
                                        backgroundColor: (TOPIC_COLORS[t.topic_name] || "#64748b") + "20",
                                        color: TOPIC_COLORS[t.topic_name] || "#94a3b8",
                                    }}
                                >
                                    {t.topic_name}
                                </span>
                                <span className="text-xs font-mono text-[var(--muted)]">
                                    {t.paper_count} papers
                                </span>
                            </div>
                        ))}
                        {topics.length === 0 && (
                            <p className="text-xs text-[var(--muted)]">No topic data</p>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
                        Timeline
                    </h2>
                    {timeline.length > 0 ? (
                        <div className="flex items-end gap-1 h-24">
                            {timeline.map((t) => (
                                <div key={t.year} className="flex flex-col items-center flex-1">
                                    <div
                                        className="w-full min-w-[8px] rounded-sm bg-gradient-to-t from-indigo-500 to-purple-400 transition-all"
                                        style={{
                                            height: `${(t.count / maxTimelineCount) * 100}%`,
                                            minHeight: "4px",
                                        }}
                                        title={`${t.year}: ${t.count} papers`}
                                    />
                                    <span className="mt-1 text-[8px] text-[var(--muted)]">{String(t.year).slice(2)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--muted)]">No timeline data</p>
                    )}
                </div>

                {/* Co-authors */}
                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
                        Co-authors
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {coauthors.slice(0, 10).map((ca) => (
                            <a
                                key={ca.id}
                                href={`/author?id=${encodeURIComponent(ca.id)}`}
                                className="flex items-center justify-between group"
                            >
                                <span className="text-sm text-[var(--muted)] group-hover:text-white transition-colors truncate">
                                    {ca.name}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-600 shrink-0 ml-2">
                                    {ca.shared_papers} shared
                                </span>
                            </a>
                        ))}
                        {coauthors.length === 0 && (
                            <p className="text-xs text-[var(--muted)]">No co-author data</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Papers */}
            <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold tracking-tight">
                    Papers ({papers.length})
                </h2>
                <div className="space-y-2">
                    {papers.map((p) => (
                        <div
                            key={p.id}
                            className="animate-fade-in rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition-all hover:border-white/[0.08]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium leading-snug">
                                        {p.url ? (
                                            <a
                                                href={p.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:text-indigo-400 transition-colors"
                                            >
                                                {p.title}
                                            </a>
                                        ) : (
                                            p.title
                                        )}
                                    </h3>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {(p.topics || "").split(",").filter(Boolean).map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-full px-2 py-0.5 text-[10px]"
                                                style={{
                                                    backgroundColor: (TOPIC_COLORS[t.trim()] || "#64748b") + "15",
                                                    color: TOPIC_COLORS[t.trim()] || "#94a3b8",
                                                }}
                                            >
                                                {t.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-4 text-[11px] font-mono text-[var(--muted)]">
                                    {p.year && <span>{p.year}</span>}
                                    <span>{p.citation_count} cit.</span>
                                </div>
                            </div>
                            {p.venue && (
                                <p className="mt-1 text-[11px] text-zinc-600">{p.venue}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
