"use client";

import React from "react";
import { api, type Stats, type ScrapeStatus, type CooccurrenceEntry } from "./lib/api";

/* ── Stat Card ─────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="animate-fade-in rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition-all hover:border-white/[0.1]">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span
          className="text-[10px] font-medium uppercase tracking-widest"
          style={{ color: accent || "var(--muted)" }}
        >
          {label}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

/* ── Topic Bar ─────────────────────────────────────────────────── */

function TopicBar({
  topic,
  count,
  max,
}: {
  topic: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="group flex items-center gap-3">
      <span className="w-48 truncate text-sm text-[var(--muted)] group-hover:text-white transition-colors">
        {topic}
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs font-mono text-[var(--muted)]">
        {count}
      </span>
    </div>
  );
}

/* ── Activity Log ──────────────────────────────────────────────── */

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "start";
}

function ActivityLog({ entries }: { entries: LogEntry[] }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  const typeStyles: Record<string, string> = {
    info: "text-zinc-400",
    success: "text-emerald-400",
    error: "text-red-400",
    start: "text-indigo-400",
  };

  return (
    <div
      ref={scrollRef}
      className="max-h-64 overflow-y-auto rounded-lg bg-black/30 p-4 font-mono text-xs leading-relaxed ring-1 ring-white/[0.04]"
    >
      {entries.length === 0 ? (
        <span className="text-zinc-600">No activity yet</span>
      ) : (
        entries.map((entry, i) => (
          <div
            key={i}
            className={`${typeStyles[entry.type] || typeStyles.info} animate-fade-in`}
            style={{ animationDelay: `${Math.max(0, i - entries.length + 5) * 30}ms` }}
          >
            <span className="mr-2 text-zinc-600">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            {entry.message}
          </div>
        ))
      )}
    </div>
  );
}

/* ── Co-occurrence Heatmap ─────────────────────────────────────── */

function CooccurrenceHeatmap({ data }: { data: CooccurrenceEntry[] }) {
  if (data.length === 0) return null;

  // Get unique topics
  const topicSet = new Set<string>();
  data.forEach((d) => {
    topicSet.add(d.topic_a);
    topicSet.add(d.topic_b);
  });
  const topics = Array.from(topicSet).sort();

  // Build lookup
  const lookup: Record<string, number> = {};
  let max = 1;
  data.forEach((d) => {
    const key = `${d.topic_a}|${d.topic_b}`;
    const keyRev = `${d.topic_b}|${d.topic_a}`;
    lookup[key] = d.shared_authors;
    lookup[keyRev] = d.shared_authors;
    max = Math.max(max, d.shared_authors);
  });

  // Short topic names for display
  function shortName(t: string) {
    return t.length > 18 ? t.substring(0, 16) + "…" : t;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="p-2" />
            {topics.map((t) => (
              <th
                key={t}
                className="p-2 text-[10px] font-normal text-[var(--muted)] max-w-20 truncate"
                style={{ writingMode: "vertical-lr", textOrientation: "sideways" }}
              >
                {shortName(t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {topics.map((row) => (
            <tr key={row}>
              <td className="p-2 text-right text-[10px] text-[var(--muted)] whitespace-nowrap">
                {shortName(row)}
              </td>
              {topics.map((col) => {
                if (row === col) {
                  return (
                    <td key={col} className="p-1">
                      <div className="w-8 h-8 rounded bg-white/[0.02]" />
                    </td>
                  );
                }
                const val = lookup[`${row}|${col}`] || 0;
                const intensity = val / max;
                return (
                  <td key={col} className="p-1">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-[9px] font-mono transition-all hover:scale-110"
                      style={{
                        backgroundColor: val > 0
                          ? `rgba(99, 102, 241, ${0.1 + intensity * 0.7})`
                          : "rgba(255,255,255,0.02)",
                        color: intensity > 0.4 ? "white" : "rgba(255,255,255,0.3)",
                      }}
                      title={`${row} ↔ ${col}: ${val} shared authors`}
                    >
                      {val > 0 ? val : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Extended ScrapeStatus type ─────────────────────────────────── */

interface ScrapeStatusExtended extends ScrapeStatus {
  current_topic?: string;
  topics_total?: number;
  topics_done?: number;
  log?: LogEntry[];
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [scrapeStatus, setScrapeStatus] = React.useState<ScrapeStatusExtended | null>(null);
  const [cooccurrence, setCooccurrence] = React.useState<CooccurrenceEntry[]>([]);
  const [scraping, setScraping] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      const [s, ss] = await Promise.all([
        api.getStats(),
        api.getScrapeStatus() as Promise<ScrapeStatusExtended>,
      ]);
      setStats(s);
      setScrapeStatus(ss);
    } catch {
      // API might not be running yet
    }
  }, []);

  const loadCooccurrence = React.useCallback(async () => {
    try {
      const data = await api.getCooccurrence();
      setCooccurrence(data);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    loadData();
    loadCooccurrence();
    const id = setInterval(loadData, 2000);
    return () => clearInterval(id);
  }, [loadData, loadCooccurrence]);

  async function handleScrapeAll() {
    setScraping(true);
    setError(null);
    try {
      await api.triggerScrape();
    } catch (e) {
      setError(String(e));
    }
    setScraping(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.triggerAnalysis();
      loadCooccurrence();
    } catch {
      // ignore
    }
    setAnalyzing(false);
  }

  const maxTopicCount = Math.max(
    ...(stats?.topic_counts?.map((t) => t.count) || [1])
  );

  const topicProgress =
    scrapeStatus?.topics_total && scrapeStatus.topics_total > 0
      ? Math.round(
        ((scrapeStatus.topics_done || 0) / scrapeStatus.topics_total) * 100
      )
      : 0;

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Research landscape overview — interdisciplinary mapping for the
            Paris community
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400 disabled:opacity-50"
          >
            {analyzing ? "⏳ Analyzing…" : "🧮 Run Analysis"}
          </button>
          <button
            onClick={handleScrapeAll}
            disabled={scraping || scrapeStatus?.running}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scrapeStatus?.running ? "⏳ Scraping…" : "🔍 Scrape All Topics"}
          </button>
        </div>
      </div>

      {/* Live scrape panel */}
      {scrapeStatus?.running && (
        <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400 shadow-[0_0_8px] shadow-indigo-400/50" />
              <span className="text-sm font-medium text-indigo-300">
                {scrapeStatus.current_topic
                  ? `Scraping: ${scrapeStatus.current_topic}`
                  : "Starting scrape…"}
              </span>
            </div>
            {scrapeStatus.topics_total > 0 && (
              <span className="text-xs font-mono text-indigo-400/60">
                {scrapeStatus.topics_done || 0}/{scrapeStatus.topics_total} topics
              </span>
            )}
          </div>

          {scrapeStatus.topics_total > 0 && (
            <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${topicProgress}%` }}
              />
            </div>
          )}

          {scrapeStatus.log && scrapeStatus.log.length > 0 && (
            <ActivityLog entries={scrapeStatus.log} />
          )}
        </div>
      )}

      {/* Last scrape results */}
      {scrapeStatus?.results && !scrapeStatus.running && (
        <div className="mb-6 space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3 text-sm text-emerald-300">
            <span className="mr-2">✅</span>
            Last scrape complete —{" "}
            {scrapeStatus.results.reduce((s, r) => s + r.papers, 0)} papers
            collected
          </div>

          {scrapeStatus.log && scrapeStatus.log.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-white transition-colors">
                Show activity log ({scrapeStatus.log.length} entries)
              </summary>
              <div className="mt-2">
                <ActivityLog entries={scrapeStatus.log} />
              </div>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="📄" label="Papers" value={stats?.paper_count ?? "—"} accent="#6366f1" />
        <StatCard icon="👤" label="Authors" value={stats?.author_count ?? "—"} accent="#8b5cf6" />
        <StatCard icon="🧬" label="Topics" value={stats?.topic_counts?.length ?? "—"} accent="#a78bfa" />
        <StatCard
          icon="🕒"
          label="Last Scrape"
          value={
            stats?.last_scrape
              ? new Date(stats.last_scrape.started_at + "Z").toLocaleDateString()
              : "Never"
          }
          accent="#c4b5fd"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Topic breakdown */}
        <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">
            Papers by Topic
          </h2>
          {stats && stats.topic_counts.length > 0 ? (
            <div className="space-y-3">
              {stats.topic_counts.map((tc) => (
                <TopicBar key={tc.topic} topic={tc.topic} count={tc.count} max={maxTopicCount} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-[var(--muted)]">
              <span className="text-4xl">🔭</span>
              <p className="text-sm">
                No data yet — hit{" "}
                <span className="font-semibold text-indigo-400">Scrape All Topics</span>{" "}
                to start
              </p>
            </div>
          )}
        </div>

        {/* Co-occurrence heatmap */}
        <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">
            Topic Co-occurrence
          </h2>
          <p className="mb-4 text-xs text-[var(--muted)]">
            Shared authors between topics — brighter = more cross-pollination
          </p>
          {cooccurrence.length > 0 ? (
            <CooccurrenceHeatmap data={cooccurrence} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-[var(--muted)]">
              <span className="text-4xl">🧮</span>
              <p className="text-sm">
                Hit{" "}
                <span className="font-semibold text-amber-400">Run Analysis</span>{" "}
                after scraping to see cross-topic connections
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
