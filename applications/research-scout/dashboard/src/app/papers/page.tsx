"use client";

import React from "react";
import { api, type Paper } from "../lib/api";

export default function PapersPage() {
    const [papers, setPapers] = React.useState<Paper[]>([]);
    const [total, setTotal] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [topicFilter, setTopicFilter] = React.useState("");
    const [sourceFilter, setSourceFilter] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [searchInput, setSearchInput] = React.useState("");
    const [topics, setTopics] = React.useState<string[]>([]);
    const [offset, setOffset] = React.useState(0);
    const limit = 30;

    // Debounce search
    React.useEffect(() => {
        const t = setTimeout(() => {
            setSearchQuery(searchInput);
            setOffset(0);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const loadPapers = React.useCallback(async () => {
        setLoading(true);
        try {
            const [res, topicList] = await Promise.all([
                api.getPapers({
                    topic: topicFilter || undefined,
                    source: sourceFilter || undefined,
                    q: searchQuery || undefined,
                    limit,
                    offset,
                }),
                api.getTopics(),
            ]);
            setPapers(res.papers);
            setTotal(res.total);
            setTopics(topicList.map((t) => t.name));
        } catch {
            // API might not be running
        }
        setLoading(false);
    }, [topicFilter, sourceFilter, searchQuery, offset]);

    React.useEffect(() => {
        loadPapers();
    }, [loadPapers]);

    function parseConcepts(raw: string): string[] {
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    return (
        <div className="px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Papers</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                    {total} papers in the database
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔍</span>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search titles & abstracts…"
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 hover:border-white/[0.15] focus:border-indigo-500/50"
                    />
                    {searchInput && (
                        <button
                            onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <select
                    value={topicFilter}
                    onChange={(e) => {
                        setTopicFilter(e.target.value);
                        setOffset(0);
                    }}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/[0.15] focus:border-indigo-500/50"
                >
                    <option value="">All Topics</option>
                    {topics.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>

                <select
                    value={sourceFilter}
                    onChange={(e) => {
                        setSourceFilter(e.target.value);
                        setOffset(0);
                    }}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/[0.15] focus:border-indigo-500/50"
                >
                    <option value="">All Sources</option>
                    <option value="openalex">OpenAlex</option>
                    <option value="semantic_scholar">Semantic Scholar</option>
                </select>
            </div>

            {/* Paper list */}
            {loading ? (
                <div className="flex items-center gap-2 py-20 text-[var(--muted)]">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                    Loading papers…
                </div>
            ) : papers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-[var(--muted)]">
                    <span className="text-4xl">📭</span>
                    <p className="text-sm">
                        No papers found. Run a scrape from the Dashboard first.
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {papers.map((p, i) => (
                            <div
                                key={p.id}
                                className="animate-fade-in rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5 transition-all hover:border-white/[0.1]"
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold leading-snug">
                                            {p.url ? (
                                                <a
                                                    href={p.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="transition-colors hover:text-indigo-400"
                                                >
                                                    {p.title}
                                                </a>
                                            ) : (
                                                p.title
                                            )}
                                        </h3>
                                        {p.abstract && (
                                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                                                {p.abstract}
                                            </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {parseConcepts(p.concepts)
                                                .slice(0, 4)
                                                .map((c) => (
                                                    <span
                                                        key={c}
                                                        className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                                                    >
                                                        {c}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 text-right">
                                        <span className="text-xs font-mono text-[var(--muted)]">
                                            {p.year || "—"}
                                        </span>
                                        <span className="text-xs text-[var(--muted)]">
                                            {p.citation_count} citations
                                        </span>
                                        <span className="mt-1 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted)]">
                                            {p.source === "openalex" ? "OA" : "S2"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex items-center justify-between text-sm text-[var(--muted)]">
                        <span>
                            Showing {offset + 1}–{Math.min(offset + limit, total)} of{" "}
                            {total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                disabled={offset === 0}
                                className="rounded-lg border border-white/[0.08] px-3 py-1.5 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setOffset(offset + limit)}
                                disabled={offset + limit >= total}
                                className="rounded-lg border border-white/[0.08] px-3 py-1.5 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
