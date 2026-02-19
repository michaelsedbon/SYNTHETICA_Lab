"use client";

import { apps, type AppInfo } from "@/lib/apps";

function StatusDot({ status }: { status: AppInfo["status"] }) {
  const colors = {
    running: "bg-emerald-400 shadow-emerald-400/50",
    stopped: "bg-zinc-500",
    dev: "bg-amber-400 shadow-amber-400/50",
  };
  const labels = { running: "Running", stopped: "Stopped", dev: "In Development" };

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`inline-block h-2 w-2 rounded-full ${colors[status]} ${status === "running" ? "shadow-[0_0_6px]" : ""
          }`}
      />
      {labels[status]}
    </span>
  );
}

function AppCard({ app }: { app: AppInfo }) {
  const href = `http://localhost:${app.frontendPort}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 transition-all duration-300 hover:border-white/[0.12] hover:from-white/[0.06] hover:to-white/[0.02] hover:shadow-[0_0_40px_-12px_rgba(255,255,255,0.06)]"
    >
      {/* Glow effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 opacity-0 transition-opacity duration-500 group-hover:from-blue-500/[0.03] group-hover:to-purple-500/[0.03] group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06] text-2xl ring-1 ring-white/[0.06] transition-colors group-hover:bg-white/[0.08] group-hover:ring-white/[0.1]">
          {app.icon}
        </div>
        <StatusDot status={app.status} />
      </div>

      <div className="relative flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {app.name}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {app.description}
        </p>
      </div>

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

      <div className="relative flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-muted-foreground">
        <div className="flex gap-3">
          {app.backendPort && (
            <span className="font-mono">:{app.backendPort}</span>
          )}
          <span className="font-mono">:{app.frontendPort}</span>
        </div>
        {app.experiment && (
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px]">
            {app.experiment}
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-foreground">
          Open
          <svg
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
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
      </div>
    </a>
  );
}

export default function Home() {
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
          <span className="font-mono">{apps.length} app{apps.length !== 1 ? "s" : ""}</span>
          <span className="h-3 w-px bg-white/10" />
          <span>SYNTHETIC_PERSONAL_LAB</span>
        </div>
      </header>

      {/* App grid */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <AppCard key={app.slug} app={app} />
        ))}

        {/* Ghost card for adding new apps */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] p-8 text-muted-foreground transition-colors hover:border-white/[0.12]">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/[0.1] text-2xl">
            +
          </div>
          <span className="text-sm">New application</span>
          <span className="text-[11px] font-mono opacity-50">/create-app</span>
        </div>
      </section>
    </main>
  );
}
