"use client";

import React from "react";
import { api, type Author } from "../lib/api";

function MisfitBar({ score }: { score: number }) {
    let color = "from-zinc-700 to-zinc-600";
    if (score >= 70) color = "from-amber-500 to-orange-500";
    else if (score >= 40) color = "from-indigo-500 to-purple-500";
    else if (score >= 15) color = "from-cyan-500 to-blue-500";

    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                />
            </div>
            <span className="text-[10px] font-mono text-[var(--muted)]">
                {score.toFixed(0)}
            </span>
        </div>
    );
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
    const pct = max > 0 ? score / max : 0;
    let color = "from-zinc-500 to-zinc-600";
    if (pct > 0.7) color = "from-indigo-500 to-purple-500";
    else if (pct > 0.4) color = "from-blue-500 to-indigo-500";
    else if (pct > 0.2) color = "from-cyan-500 to-blue-500";

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${color} px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg`}
        >
            {score}
        </span>
    );
}

type SortOption = "interdisciplinarity" | "misfit" | "citations";

export default function PeoplePage() {
    const [authors, setAuthors] = React.useState<Author[]>([]);
    const [total, setTotal] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [offset, setOffset] = React.useState(0);
    const [countries, setCountries] = React.useState<string[]>([]);
    const [countryFilter, setCountryFilter] = React.useState("");
    const [sortBy, setSortBy] = React.useState<SortOption>("interdisciplinarity");
    const [analyzing, setAnalyzing] = React.useState(false);
    const limit = 30;

    const loadAuthors = React.useCallback(async () => {
        setLoading(true);
        try {
            const [res, countryList] = await Promise.all([
                api.getAuthors({
                    limit,
                    offset,
                    country: countryFilter || undefined,
                    sort_by: sortBy,
                }),
                api.getCountries(),
            ]);
            setAuthors(res.authors);
            setTotal(res.total);
            setCountries(countryList);
        } catch {
            // API not running yet
        }
        setLoading(false);
    }, [offset, countryFilter, sortBy]);

    React.useEffect(() => {
        loadAuthors();
    }, [loadAuthors]);

    async function handleAnalyze() {
        setAnalyzing(true);
        try {
            await api.triggerAnalysis();
            loadAuthors();
        } catch {
            // ignore
        }
        setAnalyzing(false);
    }

    const maxTopicCount = Math.max(...authors.map((a) => a.topic_count || 0), 1);

    return (
        <div className="px-8 py-10">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">People</h1>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        {total} researchers — filter by country, sort by score
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[var(--muted)] transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-400 disabled:opacity-50"
                    >
                        {analyzing ? "⏳ Computing…" : "🧮 Compute Scores"}
                    </button>
                    <a
                        href={api.getExportUrl({ country: countryFilter, sort_by: sortBy })}
                        className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[var(--muted)] transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400"
                    >
                        📥 Export CSV
                    </a>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-3">
                <select
                    value={countryFilter}
                    onChange={(e) => {
                        setCountryFilter(e.target.value);
                        setOffset(0);
                    }}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/[0.15] focus:border-indigo-500/50"
                >
                    <option value="">All Countries</option>
                    {countries.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                    {(
                        [
                            { key: "interdisciplinarity", label: "Topics", icon: "🧬" },
                            { key: "misfit", label: "Misfit", icon: "🎯" },
                            { key: "citations", label: "Citations", icon: "📊" },
                        ] as const
                    ).map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => {
                                setSortBy(opt.key);
                                setOffset(0);
                            }}
                            className={`px-3 py-2 text-xs font-medium transition-all ${sortBy === opt.key
                                ? "bg-indigo-500/10 text-indigo-400"
                                : "text-[var(--muted)] hover:bg-white/[0.04]"
                                }`}
                        >
                            {opt.icon} {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 py-20 text-[var(--muted)]">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                    Loading authors…
                </div>
            ) : authors.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-[var(--muted)]">
                    <span className="text-4xl">🧑‍🔬</span>
                    <p className="text-sm">
                        No authors yet. Run a scrape to populate the database.
                    </p>
                </div>
            ) : (
                <>
                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Rank
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Affiliation
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Topics
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Misfit
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Papers
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Citations
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">
                                        Country
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {authors.map((a, i) => (
                                    <tr
                                        key={a.id}
                                        className="animate-fade-in border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]"
                                        style={{ animationDelay: `${i * 20}ms` }}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                                            #{offset + i + 1}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            <a
                                                href={`/author?id=${encodeURIComponent(a.id)}`}
                                                className="hover:text-indigo-400 transition-colors"
                                            >
                                                {a.name}
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[var(--muted)] max-w-48 truncate">
                                            {a.affiliation || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ScoreBadge
                                                score={a.topic_count}
                                                max={maxTopicCount}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <MisfitBar score={a.misfit_score || 0} />
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-xs text-[var(--muted)]">
                                            {a.paper_count_local}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-xs text-[var(--muted)]">
                                            {(a.total_citations || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-[var(--muted)]">
                                            {a.country || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
