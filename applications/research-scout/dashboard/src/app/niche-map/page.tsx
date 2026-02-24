"use client";

import React from "react";
import { api } from "../lib/api";

interface NichePoint {
    id: string;
    title: string;
    year: number | null;
    citation_count: number;
    umap_x: number;
    umap_y: number;
    topics: string;
    url: string | null;
    doi: string | null;
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

function getColor(topics: string): string {
    for (const [topic, color] of Object.entries(TOPIC_COLORS)) {
        if (topics?.includes(topic)) return color;
    }
    return "#64748b";
}

export default function NicheMapPage() {
    const [points, setPoints] = React.useState<NichePoint[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [embedding, setEmbedding] = React.useState(false);
    const [hovered, setHovered] = React.useState<NichePoint | null>(null);
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
    const [yearFilter, setYearFilter] = React.useState<number>(0);
    const [hiddenTopics, setHiddenTopics] = React.useState<Set<string>>(new Set());

    const currentYear = new Date().getFullYear();
    const filteredPoints = points.filter((p) => {
        if (yearFilter > 0 && (p.year === null || p.year < currentYear - yearFilter)) return false;
        if (hiddenTopics.size > 0) {
            const paperTopics = (p.topics || "").split(",").map((t) => t.trim());
            if (paperTopics.every((t) => hiddenTopics.has(t))) return false;
        }
        return true;
    });

    const loadData = React.useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8002/api/niche-map");
            const data = await res.json();
            setPoints(data);
        } catch {
            // ignore
        }
        setLoading(false);
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleEmbed() {
        setEmbedding(true);
        try {
            await fetch("http://localhost:8002/api/embed", { method: "POST" });
            loadData();
        } catch {
            // ignore
        }
        setEmbedding(false);
    }

    return (
        <div className="px-8 py-10">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Niche Map</h1>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        2D projection of paper abstracts — clusters reveal research niches, gaps reveal opportunities
                    </p>
                </div>
                <button
                    onClick={handleEmbed}
                    disabled={embedding}
                    className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50"
                >
                    {embedding ? "⏳ Computing embeddings…" : "🧬 Compute Embeddings"}
                </button>
                <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                    {[
                        { value: 0, label: "All" },
                        { value: 3, label: "3 yr" },
                        { value: 5, label: "5 yr" },
                        { value: 10, label: "10 yr" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setYearFilter(opt.value)}
                            className={`px-3 py-2 text-xs font-medium transition-all ${yearFilter === opt.value
                                ? "bg-indigo-500/10 text-indigo-400"
                                : "text-[var(--muted)] hover:bg-white/[0.04]"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legend & How it works */}
            <div className="mb-6 space-y-4">
                {/* Method explanation */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">How to read this map</h3>
                    <div className="grid grid-cols-1 gap-3 text-xs text-[var(--muted)] sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex gap-2">
                            <span className="text-base">📐</span>
                            <div>
                                <p className="font-medium text-white/80">Position = Abstract similarity</p>
                                <p>Papers with similar abstracts cluster together (TF-IDF + UMAP)</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-base">🎨</span>
                            <div>
                                <p className="font-medium text-white/80">Color = Topic</p>
                                <p>Each dot is colored by its research topic category</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-base">⭕</span>
                            <div>
                                <p className="font-medium text-white/80">Size = Citations</p>
                                <p>Bigger dots = more cited papers (higher impact)</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-base">🕳️</span>
                            <div>
                                <p className="font-medium text-white/80">Gaps = Opportunities</p>
                                <p>Empty spaces between clusters are unexplored niches</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Color legend — clickable to toggle */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(TOPIC_COLORS).map(([topic, color]) => {
                        const hidden = hiddenTopics.has(topic);
                        return (
                            <button
                                key={topic}
                                onClick={() => {
                                    setHiddenTopics((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(topic)) next.delete(topic);
                                        else next.add(topic);
                                        return next;
                                    });
                                }}
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all ${hidden
                                        ? "border-white/[0.04] text-zinc-600 opacity-40"
                                        : "border-white/[0.08] text-[var(--muted)] hover:border-white/[0.15]"
                                    }`}
                            >
                                <span
                                    className="inline-block h-2.5 w-2.5 rounded-full transition-opacity"
                                    style={{
                                        backgroundColor: color,
                                        opacity: hidden ? 0.2 : 1,
                                    }}
                                />
                                {topic}
                            </button>
                        );
                    })}
                    {hiddenTopics.size > 0 && (
                        <button
                            onClick={() => setHiddenTopics(new Set())}
                            className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-indigo-400 hover:bg-indigo-500/5 transition-all"
                        >
                            Show all
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 py-20 text-[var(--muted)]">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                    Loading map data…
                </div>
            ) : points.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-[var(--muted)]">
                    <span className="text-4xl">🗺️</span>
                    <p className="text-sm">
                        No embeddings yet. Hit{" "}
                        <span className="font-semibold text-indigo-400">Compute Embeddings</span>{" "}
                        after scraping papers.
                    </p>
                </div>
            ) : (
                <div
                    className="relative aspect-square max-h-[70vh] w-full rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setHovered(null)}
                >
                    {/* Grid lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
                            <React.Fragment key={p}>
                                <line x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="white" />
                                <line x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="white" />
                            </React.Fragment>
                        ))}
                    </svg>

                    {/* Points */}
                    {filteredPoints.map((p) => {
                        const size = Math.max(4, Math.min(12, Math.sqrt(p.citation_count || 1) * 1.5));
                        const color = getColor(p.topics);
                        return (
                            <div
                                key={p.id}
                                className="absolute rounded-full transition-transform duration-150 hover:scale-[2] cursor-pointer"
                                style={{
                                    left: `${p.umap_x}%`,
                                    top: `${p.umap_y}%`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    backgroundColor: color,
                                    opacity: hovered && hovered.id !== p.id ? 0.2 : 0.7,
                                    boxShadow: `0 0 ${size}px ${color}40`,
                                    transform: "translate(-50%, -50%)",
                                }}
                                onMouseEnter={() => setHovered(p)}
                                onClick={() => {
                                    const link = p.url || (p.doi ? `https://doi.org/${p.doi}` : null);
                                    if (link) window.open(link, "_blank");
                                }}
                            />
                        );
                    })}

                    {/* Tooltip */}
                    {hovered && (
                        <div
                            className="absolute z-50 pointer-events-none rounded-lg border border-white/[0.1] bg-[var(--card)] px-4 py-3 shadow-2xl"
                            style={{
                                left: Math.min(mousePos.x + 12, window.innerWidth - 350),
                                top: mousePos.y - 10,
                                maxWidth: "320px",
                            }}
                        >
                            <p className="text-sm font-medium leading-tight">{hovered.title}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(hovered.topics || "").split(",").map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                        style={{
                                            backgroundColor: getColor(t) + "20",
                                            color: getColor(t),
                                        }}
                                    >
                                        {t.trim()}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-1.5 flex gap-3 text-[10px] text-[var(--muted)]">
                                {hovered.year && <span>📅 {hovered.year}</span>}
                                <span>📊 {hovered.citation_count} citations</span>
                            </div>
                        </div>
                    )}

                    {/* Stats overlay */}
                    <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[var(--muted)] opacity-50">
                        {filteredPoints.length} papers{yearFilter > 0 ? ` (last ${yearFilter}yr)` : ""}
                    </div>
                </div>
            )}
        </div>
    );
}
