"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Config ── Agent always runs on the server
const AGENT_SERVER = "172.16.1.80";
const agentUrl = (path: string) => `http://${AGENT_SERVER}:8003${path}`;
const agentWs = () => `ws://${AGENT_SERVER}:8003/ws/agent`;

// ── Types ──
interface TimelineEvent {
    id: string;
    timestamp: string;
    agent_id: string;
    event_type: string;
    title: string;
    content: string;
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    tool_output?: string;
    duration_ms?: number;
    files_touched: string[];
    session_id: string;
    experiment?: string;
}

interface Session {
    session_id: string;
    event_count: number;
    first_event: string;
    last_event: string;
}

interface FileEntry {
    name: string;
    is_dir: boolean;
    size?: number;
}

// ── Event icons ──
const ICONS: Record<string, string> = {
    reasoning: "💭",
    tool_call: "🔧",
    observation: "📊",
    decision: "✅",
    error: "⚠️",
    info: "ℹ️",
};

// ── Helpers ──
function fmtTime(iso: string): string {
    try { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return ""; }
}
function fmtDur(ms?: number): string {
    if (!ms) return "";
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
function fmtAge(iso: string): string {
    try {
        const s = (Date.now() - new Date(iso).getTime()) / 1000;
        if (s < 60) return "now";
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        if (s < 86400) return `${Math.floor(s / 3600)}h`;
        return new Date(iso).toLocaleDateString();
    } catch { return ""; }
}

// ── Main ──
export default function AgentPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [selected, setSelected] = useState<TimelineEvent | null>(null);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
    const [busy, setBusy] = useState(false);
    const [connected, setConnected] = useState(false);
    const [status, setStatus] = useState<Record<string, unknown> | null>(null);

    // Filters
    const [fType, setFType] = useState("all");

    // File browser
    const [filePath, setFilePath] = useState("/opt/synthetica-lab");
    const [fileList, setFileList] = useState<FileEntry[]>([]);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileViewing, setFileViewing] = useState<string | null>(null);

    // Right panel tab
    const [tab, setTab] = useState<"timeline" | "files">("timeline");

    const chatEnd = useRef<HTMLDivElement>(null);
    const ws = useRef<WebSocket | null>(null);

    // ── WebSocket ──
    useEffect(() => {
        function connect() {
            const s = new WebSocket(agentWs());
            s.onopen = () => setConnected(true);
            s.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
            s.onerror = () => s.close();
            s.onmessage = (m) => {
                try {
                    setEvents(p => [...p, JSON.parse(m.data)]);
                } catch { }
            };
            ws.current = s;
        }
        connect();
        return () => { ws.current?.close(); };
    }, []);

    // ── Load sessions + status ──
    useEffect(() => {
        fetch(agentUrl("/api/agent/sessions")).then(r => r.json()).then(setSessions).catch(() => { });
        fetch(agentUrl("/api/agent/status")).then(r => r.json()).then(setStatus).catch(() => { });
    }, [events.length]);

    // ── Load file list (direct API, no LLM) ──
    const loadDir = useCallback((path: string) => {
        setFilePath(path);
        setFileContent(null);
        setFileViewing(null);
        const relPath = path.replace("/opt/synthetica-lab", "").replace(/^\//, "");
        fetch(agentUrl(`/api/files/list?path=${encodeURIComponent(relPath)}`))
            .then(r => r.json())
            .then(data => {
                if (data.entries) {
                    setFileList(data.entries);
                    setFilePath(data.path || path);
                }
            })
            .catch(() => { });
    }, []);

    const viewFile = useCallback((path: string) => {
        setFileViewing(path);
        setFileContent(null);
        fetch(agentUrl(`/api/files/read?path=${encodeURIComponent(path)}`))
            .then(r => r.json())
            .then(data => {
                if (data.content) setFileContent(data.content);
                else if (data.error) setFileContent(`Error: ${data.error}`);
            })
            .catch(() => { });
    }, []);

    // ── Load session ──
    const loadSession = useCallback((sid: string) => {
        setSessionId(sid);
        setSelected(null);
        fetch(agentUrl(`/api/agent/timeline/${sid}?limit=500`))
            .then(r => r.json()).then(setEvents).catch(() => { });
    }, []);

    // ── Send message ──
    const send = useCallback(async () => {
        if (!input.trim() || busy) return;
        const msg = input.trim();
        setInput("");
        setMessages(p => [...p, { role: "user", text: msg }]);
        setBusy(true);
        try {
            const res = await fetch(agentUrl("/api/agent/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, session_id: sessionId, experiment: "EXP_002" }),
            });
            const data = await res.json();
            setSessionId(data.session_id);
            const newEvents: TimelineEvent[] = data.events || [];
            setEvents(p => [...p, ...newEvents]);
            const last = newEvents.filter(e => e.event_type === "reasoning" && e.content).pop();
            if (last) setMessages(p => [...p, { role: "agent", text: last.content }]);
        } catch (e) {
            setMessages(p => [...p, { role: "agent", text: `Error: ${e}` }]);
        } finally { setBusy(false); }
    }, [input, busy, sessionId]);

    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const filtered = events.filter(e => fType === "all" || e.event_type === fType);
    const agents = [...new Set(events.map(e => e.agent_id))];
    const activeCount = status ? Object.keys((status as { agents?: Record<string, unknown> }).agents || {}).length : 0;

    return (
        <div className="flex h-screen bg-background text-foreground" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

            {/* ── Left: Chat ── */}
            <aside className="w-80 flex flex-col border-r border-border bg-sidebar">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-sm font-semibold">Lab Agent</span>
                    </div>
                    <a href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                        ← Experiments
                    </a>
                </div>

                {/* Active agents */}
                <div className="px-4 py-2 border-b border-border text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                        <span>{activeCount} active session{activeCount !== 1 ? "s" : ""}</span>
                        <span>{connected ? "● live" : "○ offline"}</span>
                    </div>
                </div>

                {/* Sessions */}
                {sessions.length > 0 && (
                    <div className="border-b border-border max-h-32 overflow-y-auto">
                        {sessions.map(s => (
                            <button key={s.session_id} onClick={() => loadSession(s.session_id)}
                                className={`w-full text-left px-4 py-1.5 text-[11px] transition-colors ${sessionId === s.session_id ? "bg-accent" : "hover:bg-muted/30"}`}>
                                <span className="font-mono">{s.session_id}</span>
                                <span className="text-muted-foreground ml-2">{s.event_count} events · {s.last_event ? fmtAge(s.last_event) : ""}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground/40 text-xs mt-12">
                            <div className="text-lg mb-1">🧪</div>
                            Ask the agent anything
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[90%] rounded-md px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user"
                                ? "bg-blue-600/20 border border-blue-500/20"
                                : "bg-muted/40 border border-border"
                                }`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {busy && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                            <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Thinking…
                        </div>
                    )}
                    <div ref={chatEnd} />
                </div>

                {/* Input */}
                <div className="px-3 py-2.5 border-t border-border">
                    <div className="flex gap-1.5">
                        <input type="text" value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                            placeholder="Message…"
                            disabled={busy}
                            className="flex-1 bg-muted/30 border border-border rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-blue-500/40 transition-colors placeholder:text-muted-foreground/40" />
                        <button onClick={send} disabled={busy || !input.trim()}
                            className="px-2.5 py-1.5 bg-foreground/10 hover:bg-foreground/15 disabled:opacity-20 rounded-md text-xs font-medium transition-colors">
                            ↑
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Right: Timeline / Files ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Tab bar */}
                <div className="flex items-center px-4 py-2 border-b border-border gap-4">
                    <button onClick={() => setTab("timeline")}
                        className={`text-xs font-medium pb-0.5 transition-colors ${tab === "timeline" ? "text-foreground border-b border-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        Timeline
                    </button>
                    <button onClick={() => setTab("files")}
                        className={`text-xs font-medium pb-0.5 transition-colors ${tab === "files" ? "text-foreground border-b border-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        Files
                    </button>
                    <div className="flex-1" />
                    {tab === "timeline" && (
                        <>
                            <select value={fType} onChange={e => setFType(e.target.value)}
                                className="text-[11px] bg-transparent border border-border rounded px-1.5 py-0.5 text-muted-foreground outline-none">
                                <option value="all">All</option>
                                <option value="reasoning">💭 Reasoning</option>
                                <option value="tool_call">🔧 Tools</option>
                                <option value="error">⚠️ Errors</option>
                                <option value="decision">✅ Decisions</option>
                            </select>
                            <span className="text-[11px] text-muted-foreground/50 font-mono">{filtered.length}</span>
                        </>
                    )}
                </div>

                {/* ── Timeline Tab ── */}
                {tab === "timeline" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Timeline rail */}
                        <div className="border-b border-border px-4 py-2 overflow-x-auto">
                            {agents.length === 0 ? (
                                <div className="h-12 flex items-center text-xs text-muted-foreground/40">Waiting for events…</div>
                            ) : agents.map(aid => {
                                const ae = filtered.filter(e => e.agent_id === aid);
                                if (!ae.length) return null;
                                return (
                                    <div key={aid} className="flex items-center gap-2 mb-1 last:mb-0">
                                        <span className="w-16 text-[10px] text-muted-foreground truncate">{aid}</span>
                                        <div className="flex items-center gap-px flex-1 overflow-x-auto py-1">
                                            {ae.map(e => (
                                                <button key={e.id} onClick={() => setSelected(e)}
                                                    className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center flex-shrink-0 transition-all
                            ${selected?.id === e.id ? "ring-1 ring-foreground scale-110" : "hover:scale-105 opacity-60 hover:opacity-100"}
                            ${e.event_type === "error" ? "bg-red-500/20" : e.event_type === "tool_call" ? "bg-amber-500/15" : "bg-foreground/5"}`}
                                                    title={`${e.title} — ${fmtTime(e.timestamp)}`}>
                                                    {ICONS[e.event_type] || "·"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Event detail / list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {selected ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span>{ICONS[selected.event_type] || ""}</span>
                                            <span className="font-medium">{selected.title}</span>
                                            {selected.duration_ms != null && <span className="text-[11px] text-muted-foreground font-mono">{fmtDur(selected.duration_ms)}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground font-mono">{fmtTime(selected.timestamp)}</span>
                                            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                                        </div>
                                    </div>
                                    {selected.content && (
                                        <pre className="text-xs font-mono bg-muted/20 border border-border rounded-md p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                            {selected.content}
                                        </pre>
                                    )}
                                    {selected.tool_input && (
                                        <div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Input</div>
                                            <pre className="text-xs font-mono bg-muted/20 rounded-md p-2 overflow-x-auto border border-border">
                                                {JSON.stringify(selected.tool_input, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {selected.tool_output && (
                                        <div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Output</div>
                                            <pre className="text-xs font-mono bg-muted/20 rounded-md p-2 max-h-60 overflow-y-auto border border-border">
                                                {selected.tool_output}
                                            </pre>
                                        </div>
                                    )}
                                    {selected.files_touched.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            {selected.files_touched.map((f, i) => (
                                                <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-muted/30 rounded">{f.split("/").pop()}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : filtered.length > 0 ? (
                                <div className="space-y-px">
                                    {filtered.map(e => (
                                        <button key={e.id} onClick={() => setSelected(e)}
                                            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/20 transition-colors text-[12px]">
                                            <span className="w-4 text-center">{ICONS[e.event_type] || ""}</span>
                                            <span className="flex-1 truncate text-foreground/70">{e.title}</span>
                                            {e.tool_name && <span className="text-[10px] font-mono text-muted-foreground/60">{e.tool_name}</span>}
                                            {e.duration_ms != null && <span className="text-[10px] font-mono text-muted-foreground/40">{fmtDur(e.duration_ms)}</span>}
                                            <span className="text-[10px] font-mono text-muted-foreground/30">{fmtTime(e.timestamp)}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground/30 text-xs">
                                    Send a message to begin
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Files Tab ── */}
                {tab === "files" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Path bar */}
                        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                            <span className="text-[11px] font-mono text-muted-foreground truncate flex-1">{filePath}</span>
                            <button onClick={() => loadDir(filePath)} className="text-[11px] text-muted-foreground hover:text-foreground">↻</button>
                            {filePath !== "/opt/synthetica-lab" && (
                                <button onClick={() => loadDir(filePath.split("/").slice(0, -1).join("/") || "/")}
                                    className="text-[11px] text-muted-foreground hover:text-foreground">↑ Up</button>
                            )}
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* File list */}
                            <div className="w-64 border-r border-border overflow-y-auto flex-shrink-0">
                                {fileList.length === 0 ? (
                                    <div className="px-4 py-8 text-xs text-muted-foreground/40 text-center">
                                        Click ↻ to load directory
                                    </div>
                                ) : (
                                    <div className="py-1">
                                        {fileList.filter(f => f.is_dir).map(f => (
                                            <button key={f.name} onClick={() => loadDir(`${filePath}/${f.name}`)}
                                                className="w-full text-left px-3 py-1 text-[12px] hover:bg-muted/20 transition-colors flex items-center gap-1.5">
                                                <span className="text-muted-foreground">📁</span>
                                                <span className="truncate">{f.name}</span>
                                            </button>
                                        ))}
                                        {fileList.filter(f => !f.is_dir).map(f => (
                                            <button key={f.name} onClick={() => viewFile(`${filePath}/${f.name}`)}
                                                className={`w-full text-left px-3 py-1 text-[12px] hover:bg-muted/20 transition-colors flex items-center gap-1.5
                          ${fileViewing === `${filePath}/${f.name}` ? "bg-accent" : ""}`}>
                                                <span className="text-muted-foreground/60">📄</span>
                                                <span className="truncate flex-1">{f.name}</span>
                                                {f.size != null && <span className="text-[10px] text-muted-foreground/40">{f.size > 1024 ? `${(f.size / 1024).toFixed(0)}K` : `${f.size}B`}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* File content */}
                            <div className="flex-1 overflow-auto">
                                {fileViewing ? (
                                    <div className="p-4">
                                        <div className="text-[11px] text-muted-foreground font-mono mb-2">{fileViewing.split("/").pop()}</div>
                                        <pre className="text-xs font-mono bg-muted/10 border border-border rounded-md p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                            {fileContent || "Loading…"}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground/30">
                                        Select a file to view
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
