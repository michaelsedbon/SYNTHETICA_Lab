"use client";

import React from "react";
import { apps, type AppInfo } from "@/lib/apps";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PortHealth {
  port: number;
  label: string;
  up: boolean;
}

interface AppHealth {
  slug: string;
  ports: PortHealth[];
  allUp: boolean;
  anyUp: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

function useHealthPolling(intervalMs = 5000) {
  const [health, setHealth] = React.useState<Record<string, AppHealth>>({});

  React.useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const map: Record<string, AppHealth> = {};
        for (const a of data.apps) {
          map[a.slug] = a;
        }
        setHealth(map);
      } catch {
        // ignore fetch errors
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return health;
}

/* -------------------------------------------------------------------------- */
/*  Components                                                                */
/* -------------------------------------------------------------------------- */

function StatusIndicator({
  health,
  loading,
}: {
  health?: AppHealth;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_6px] shadow-blue-400/50" />
        Starting…
      </span>
    );
  }

  if (!health) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-500" />
        Checking…
      </span>
    );
  }

  if (health.allUp) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/50" />
        Online
      </span>
    );
  }

  if (health.anyUp) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px] shadow-amber-400/50" />
        Partial
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
      Offline
    </span>
  );
}

function AppCard({
  app,
  health,
  onRefresh,
}: {
  app: AppInfo;
  health?: AppHealth;
  onRefresh: () => void;
}) {
  const [href, setHref] = React.useState(`http://localhost:${app.frontendPort}`);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHref(`http://${window.location.hostname}:${app.frontendPort}`);
  }, [app.frontendPort]);

  const isUp = health?.anyUp ?? false;

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/apps/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: app.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Start failed");
      } else if (data.errors?.length && !data.started?.length) {
        setError(data.errors[0]);
      }
      // Wait a few seconds for processes to start, then refresh health
      await new Promise((r) => setTimeout(r, 4000));
      onRefresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/apps/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: app.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Stop failed");
      }
      await new Promise((r) => setTimeout(r, 1000));
      onRefresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 transition-all duration-300 hover:border-white/[0.12] hover:from-white/[0.06] hover:to-white/[0.02] hover:shadow-[0_0_40px_-12px_rgba(255,255,255,0.06)]">
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 opacity-0 transition-opacity duration-500 group-hover:from-blue-500/[0.03] group-hover:to-purple-500/[0.03] group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06] text-2xl ring-1 ring-white/[0.06] transition-colors group-hover:bg-white/[0.08] group-hover:ring-white/[0.1]">
          {app.icon}
        </div>
        <StatusIndicator health={health} loading={loading} />
      </div>

      <div className="relative flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {app.name}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {app.description}
        </p>
      </div>

      {/* Port health details */}
      {health && health.ports.length > 1 && (
        <div className="relative flex gap-3 text-[11px] text-muted-foreground">
          {health.ports.map((p) => (
            <span key={p.port} className="flex items-center gap-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${p.up ? "bg-emerald-400" : "bg-zinc-500"
                  }`}
              />
              {p.label} :{p.port}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-auto flex flex-wrap gap-1.5">
        {app.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground ring-1 ring-white/[0.04]"
          >
            {tag}
          </span>
        ))}
      </div>

      {error && (
        <div className="relative rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      {/* Action bar */}
      <div className="relative flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-muted-foreground">
        <div className="flex gap-2">
          {app.managed && (
            <>
              {!isUp ? (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="rounded-md bg-emerald-500/15 px-3 py-1.5 font-medium text-emerald-400 ring-1 ring-emerald-500/25 transition-all hover:bg-emerald-500/25 hover:text-emerald-300 disabled:opacity-50"
                >
                  {loading ? "Starting…" : "▶ Start"}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="rounded-md bg-red-500/10 px-3 py-1.5 font-medium text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                >
                  {loading ? "Stopping…" : "■ Stop"}
                </button>
              )}
            </>
          )}
        </div>

        {isUp ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Open
            <svg
              className="h-3 w-3 transition-transform hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H21m0 0v7.5m0-7.5l-10.5 10.5"
              />
            </svg>
          </a>
        ) : (
          <span className="flex items-center gap-1 opacity-30">
            Open
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H21m0 0v7.5m0-7.5l-10.5 10.5"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const health = useHealthPolling(5000);
  const [, setTick] = React.useState(0);

  function triggerRefresh() {
    // Force a re-poll by bumping a counter
    setTick((t) => t + 1);
    // Also trigger an immediate health poll
    fetch("/api/health")
      .then((r) => r.json())
      .then(() => setTick((t) => t + 1))
      .catch(() => { });
  }

  return (
    <main className="min-h-screen px-6 py-12 sm:px-12 lg:px-20">
      {/* Header */}
      <header className="mb-12 max-w-2xl">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xl ring-1 ring-white/[0.08]">
            🧬
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Applications</h1>
        </div>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Central launcher for all laboratory web tools. Each card links to a
          self-contained app running on its own port.
        </p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono">
            {apps.length} app{apps.length !== 1 ? "s" : ""}
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span>SYNTHETIC_PERSONAL_LAB</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${Object.values(health).every((h) => h.allUp)
                ? "bg-emerald-400"
                : Object.values(health).some((h) => h.anyUp)
                  ? "bg-amber-400"
                  : "bg-zinc-500"
                }`}
            />
            {Object.keys(health).length === 0
              ? "Checking…"
              : Object.values(health).every((h) => h.allUp)
                ? "All systems online"
                : "Some offline"}
          </span>
        </div>
      </header>

      {/* App grid */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <AppCard
            key={app.slug}
            app={app}
            health={health[app.slug]}
            onRefresh={triggerRefresh}
          />
        ))}

        {/* Ghost card */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] p-8 text-muted-foreground transition-colors hover:border-white/[0.12]">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/[0.1] text-2xl">
            +
          </div>
          <span className="text-sm">New application</span>
          <span className="font-mono text-[11px] opacity-50">/create-app</span>
        </div>
      </section>
    </main>
  );
}
