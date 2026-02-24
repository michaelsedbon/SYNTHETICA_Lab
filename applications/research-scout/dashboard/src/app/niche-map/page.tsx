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
}

const TOPIC_COLORS: Record<string, string> = {
    "Synthetic Biology × Robotics": "#6366f1",
    "BioArt & Living Design": "#ec4899",
    "AI for Wetlab": "#10b981",
    "DIYBio & Maker Biotech": "#f59e0b",
    "Soft Robotics × Biology": "#8b5cf6",
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
            </div>

            {/* Legend */}
            <div className="mb-6 flex flex-wrap gap-4">
                {Object.entries(TOPIC_COLORS).map(([topic, color]) => (
                    <div key={topic} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        {topic}
                    </div>
                ))}
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
                    {points.map((p) => {
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
                        {points.length} papers
                    </div>
                </div>
            )}
        </div>
    );
}
