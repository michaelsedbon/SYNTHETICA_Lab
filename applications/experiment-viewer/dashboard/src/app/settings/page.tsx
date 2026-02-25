"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────

interface SourceEntry {
    label: string;
    path: string;
}

// ── API helpers ────────────────────────────────────────────────────

function apiBase(): string {
    if (typeof window === "undefined") return "http://localhost:8001";
    return `http://${window.location.hostname}:8001`;
}

async function fetchSettings(): Promise<{ sources: SourceEntry[] }> {
    const res = await fetch(`${apiBase()}/api/settings`);
    return res.json();
}

async function saveSettings(sources: SourceEntry[]): Promise<{ ok?: boolean; detail?: { errors: string[] } }> {
    const res = await fetch(`${apiBase()}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
    });
    return res.json();
}

// ── Component ──────────────────────────────────────────────────────

export default function SettingsPage() {
    const router = useRouter();
    const [sources, setSources] = useState<SourceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        fetchSettings().then((data) => {
            setSources(data.sources || []);
            setLoading(false);
        }).catch(() => {
            setFeedback({ type: "error", message: "Failed to load settings" });
            setLoading(false);
        });
    }, []);

    const updateSource = (index: number, field: keyof SourceEntry, value: string) => {
        setSources((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
        setDirty(true);
        setFeedback(null);
    };

    const addSource = () => {
        setSources((prev) => [...prev, { label: "", path: "" }]);
        setDirty(true);
        setFeedback(null);
    };

    const removeSource = (index: number) => {
        setSources((prev) => prev.filter((_, i) => i !== index));
        setDirty(true);
        setFeedback(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);

        try {
            const result = await saveSettings(sources);
            if (result.ok) {
                setFeedback({ type: "success", message: "Settings saved successfully" });
                setDirty(false);
            } else if (result.detail?.errors) {
                setFeedback({ type: "error", message: result.detail.errors.join("\n") });
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to save settings" });
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading settings…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/")}
                            className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                            title="Back to viewer"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚙️</span>
                            <h1 className="text-base font-semibold text-foreground">Settings</h1>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${dirty
                                ? "bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/25"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                            }
              ${saving ? "opacity-60 cursor-wait" : ""}
            `}
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Feedback */}
                {feedback && (
                    <div
                        className={`
              mb-6 px-4 py-3 rounded-lg text-sm flex items-start gap-2
              ${feedback.type === "success"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }
            `}
                    >
                        <span className="mt-0.5">
                            {feedback.type === "success" ? "✓" : "✕"}
                        </span>
                        <span className="whitespace-pre-line">{feedback.message}</span>
                    </div>
                )}

                {/* Sources section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                                Experiment Sources
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                Directories to scan for experiment markdown files
                            </p>
                        </div>
                        <button
                            onClick={addSource}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted
                         border border-border/50 transition-all duration-200"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Source
                        </button>
                    </div>

                    <div className="space-y-3">
                        {sources.map((source, index) => (
                            <div
                                key={index}
                                className="group relative bg-card border border-border rounded-xl p-4
                           hover:border-border/80 transition-all duration-200"
                            >
                                <div className="flex gap-3">
                                    {/* Index badge */}
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center
                                  text-xs font-mono text-muted-foreground mt-0.5">
                                        {index + 1}
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        {/* Label field */}
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
                                            <input
                                                type="text"
                                                value={source.label}
                                                onChange={(e) => updateSource(index, "label", e.target.value)}
                                                placeholder="e.g. Lab, PhD, External…"
                                                className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2
                                   text-sm text-foreground placeholder:text-muted-foreground/50
                                   focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring
                                   transition-all duration-200"
                                            />
                                        </div>

                                        {/* Path field */}
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Directory Path</label>
                                            <input
                                                type="text"
                                                value={source.path}
                                                onChange={(e) => updateSource(index, "path", e.target.value)}
                                                placeholder="/absolute/path/to/experiments"
                                                className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2
                                   text-sm text-foreground font-mono text-[13px]
                                   placeholder:text-muted-foreground/50 placeholder:font-sans
                                   focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring
                                   transition-all duration-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        onClick={() => removeSource(index)}
                                        className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground/40
                               hover:text-red-400 hover:bg-red-500/10
                               opacity-0 group-hover:opacity-100
                               transition-all duration-200 self-start mt-0.5"
                                        title="Remove source"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {sources.length === 0 && (
                            <div className="text-center py-12 border border-dashed border-border rounded-xl">
                                <span className="text-3xl block mb-3">📁</span>
                                <p className="text-sm text-muted-foreground mb-3">No sources configured</p>
                                <button
                                    onClick={addSource}
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Add your first source →
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Info */}
                <div className="mt-8 px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                    <p>
                        <strong className="text-foreground/80">Tip:</strong> Each source should point to a directory
                        containing experiment folders (e.g. <code className="px-1 py-0.5 rounded bg-muted/60 text-[11px]">EXP_001/</code>)
                        with <code className="px-1 py-0.5 rounded bg-muted/60 text-[11px]">.md</code> files inside.
                    </p>
                </div>
            </main>
        </div>
    );
}
