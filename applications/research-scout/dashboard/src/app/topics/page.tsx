"use client";

import React from "react";
import { api, type Topic } from "../lib/api";

export default function TopicsPage() {
    const [topics, setTopics] = React.useState<Topic[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [scraping, setScraping] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState<string | null>(null);

    const loadTopics = React.useCallback(async () => {
        try {
            const t = await api.getTopics();
            setTopics(t);
        } catch {
            // API not running
        }
        setLoading(false);
    }, []);

    React.useEffect(() => {
        loadTopics();
    }, [loadTopics]);

    async function handleScrape(topicName: string) {
        setScraping(topicName);
        setMessage(null);
        try {
            await api.triggerScrape(topicName);
            setMessage(`Scraping "${topicName}" — this may take a few minutes…`);
            // Poll for completion
            const poll = setInterval(async () => {
                const status = await api.getScrapeStatus();
                if (!status.running) {
                    clearInterval(poll);
                    setScraping(null);
                    setMessage(`Done scraping "${topicName}"`);
                    loadTopics();
                }
            }, 3000);
        } catch (e) {
            setMessage(`Error: ${e}`);
            setScraping(null);
        }
    }

    return (
        <div className="px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                    Configured research topics — edit{" "}
                    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-indigo-400">
                        config/topics.yaml
                    </code>{" "}
                    to add new ones
                </p>
            </div>

            {message && (
                <div
                    className={`mb-6 rounded-xl border px-5 py-3 text-sm ${message.startsWith("Error")
                            ? "border-red-500/20 bg-red-500/5 text-red-400"
                            : message.startsWith("Done")
                                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                                : "border-indigo-500/20 bg-indigo-500/5 text-indigo-300"
                        }`}
                >
                    {message}
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 py-20 text-[var(--muted)]">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                    Loading topics…
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {topics.map((topic, i) => (
                        <div
                            key={topic.name}
                            className="animate-fade-in group relative rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 transition-all hover:border-white/[0.12]"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            {/* Glow */}
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/0 to-purple-500/0 opacity-0 transition-opacity duration-500 group-hover:from-indigo-500/[0.03] group-hover:to-purple-500/[0.03] group-hover:opacity-100" />

                            <div className="relative">
                                <h3 className="text-base font-semibold tracking-tight">
                                    {topic.name}
                                </h3>

                                <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
                                    <span>📄 {topic.paper_count} papers</span>
                                    <span>🔗 {topic.queries.length} queries</span>
                                </div>

                                {/* Sources */}
                                <div className="mt-3 flex gap-1.5">
                                    {topic.sources.map((s) => (
                                        <span
                                            key={s}
                                            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted)] ring-1 ring-white/[0.04]"
                                        >
                                            {s === "openalex" ? "OpenAlex" : "Semantic Scholar"}
                                        </span>
                                    ))}
                                </div>

                                {/* Queries */}
                                <div className="mt-3 space-y-1">
                                    {topic.queries.map((q) => (
                                        <p
                                            key={q}
                                            className="text-xs text-[var(--muted)] before:mr-1 before:text-indigo-400 before:content-['›']"
                                        >
                                            {q}
                                        </p>
                                    ))}
                                </div>

                                {/* Scrape button */}
                                <button
                                    onClick={() => handleScrape(topic.name)}
                                    disabled={scraping !== null}
                                    className="mt-4 w-full rounded-lg border border-white/[0.08] py-2 text-xs font-medium text-[var(--muted)] transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-400 disabled:opacity-30"
                                >
                                    {scraping === topic.name
                                        ? "⏳ Scraping…"
                                        : "🔍 Scrape this topic"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
