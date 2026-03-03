"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    Bot, ArrowLeft, Send, Loader2, ChevronRight, ChevronDown,
    File, Folder, FolderOpen, Clock, Activity, Wrench,
    Brain, AlertTriangle, CheckCircle, Info, Filter,
    GripVertical, RefreshCw, ArrowUp, X, MessageSquare, FolderTree,
    Circle, GitBranch, Cpu, Zap, Calendar, ToggleLeft, ToggleRight,
    Plus, Trash2, Play, BookOpen, Sparkles, MessageCircle
} from "lucide-react";

// ── Config ──
const AGENT_SERVER = "172.16.1.80";
const api = (path: string) => `http://${AGENT_SERVER}:8003${path}`;

// ── Types ──
type TEvent = {
    id: string; timestamp: string; agent_id: string; event_type: string;
    title: string; content: string; tool_name?: string;
    tool_input?: Record<string, unknown>; tool_output?: string;
    duration_ms?: number; files_touched: string[]; session_id: string;
    experiment?: string;
};
type Session = { session_id: string; event_count: number; first_event: string; last_event: string };
type FileEntry = { name: string; is_dir: boolean; size?: number | null };
type ScheduledTask = {
    name: string; message: string; interval_seconds: number;
    interval_human: string; experiment: string | null;
    enabled: boolean; last_run: string | null; run_count: number;
};
type AgentStatus = {
    agents: Record<string, {
        session_id: string; agent_id: string; model: string;
        coder_model?: string; gemini_model?: string | null;
        planner_enabled: boolean; is_running: boolean;
        active_experiment: string; message_count: number; event_count: number;
    }>;
    total_sessions: number;
    scheduler: { tasks: ScheduledTask[] };
    telegram: { enabled: boolean; chat_id: string | null };
};

// ── Event config ──
const EVT: Record<string, { icon: typeof Brain; color: string }> = {
    reasoning: { icon: Brain, color: "text-blue-400" },
    tool_call: { icon: Wrench, color: "text-amber-400" },
    observation: { icon: Activity, color: "text-green-400" },
    decision: { icon: CheckCircle, color: "text-purple-400" },
    error: { icon: AlertTriangle, color: "text-red-400" },
    info: { icon: Info, color: "text-zinc-400" },
};

// ── Helpers ──
const fmtTime = (iso: string) => { try { const d = new Date(iso); return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return ""; } };
const fmtDur = (ms?: number) => !ms ? "" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
const fmtAge = (iso: string) => {
    try {
        const ms = Date.now() - new Date(iso).getTime();
        if (ms < 60000) return "now";
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
        if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
        return `${Math.floor(ms / 86400000)}d`;
    } catch { return ""; }
};
const fmtSize = (b?: number | null) => {
    if (b == null) return "";
    if (b < 1024) return `${b}B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)}K`;
    return `${(b / 1048576).toFixed(1)}M`;
};

// ── Simple markdown renderer ──
function MdRender({ text }: { text: string }) {
    const html = useMemo(() => {
        let s = text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted/10 border border-border rounded-md px-3 py-2 my-1.5 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">$2</pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-muted/20 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/^### (.+)$/gm, '<div class="text-[12px] font-semibold mt-2 mb-0.5">$1</div>')
            .replace(/^## (.+)$/gm, '<div class="text-[13px] font-semibold mt-2.5 mb-0.5">$1</div>')
            .replace(/^# (.+)$/gm, '<div class="text-[14px] font-bold mt-3 mb-1">$1</div>')
            .replace(/^[-*] (.+)$/gm, '<div class="pl-3 relative"><span class="absolute left-0 text-muted-foreground/30">•</span> $1</div>')
            .replace(/\n/g, "<br/>");
        return s;
    }, [text]);
    return <div className="text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Main component ──
export default function AgentPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [events, setEvents] = useState<TEvent[]>([]);
    const [selected, setSelected] = useState<TEvent | null>(null);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
    const [busy, setBusy] = useState(false);
    const [connected, setConnected] = useState(false);
    const [status, setStatus] = useState<AgentStatus | null>(null);
    const [fType, setFType] = useState("all");

    // File browser
    const [filePath, setFilePath] = useState("/opt/synthetica-lab");
    const [fileList, setFileList] = useState<FileEntry[]>([]);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileViewing, setFileViewing] = useState<string | null>(null);

    // Layout
    const [tab, setTab] = useState<"timeline" | "files" | "scheduler" | "memory">("timeline");
    const [leftW, setLeftW] = useState(340);
    const dragRef = useRef<{ active: boolean; startX: number; startW: number }>({ active: false, startX: 0, startW: 340 });

    // Scheduler
    const [schedTasks, setSchedTasks] = useState<ScheduledTask[]>([]);
    const [newTask, setNewTask] = useState({ name: "", message: "", interval: "3600" });
    const [showAddTask, setShowAddTask] = useState(false);

    // Memory
    const [agentMemory, setAgentMemory] = useState<string | null>(null);

    const chatEnd = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const ws = useRef<WebSocket | null>(null);

    // ── Resize handler ──
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current.active) return;
            const newW = dragRef.current.startW + (e.clientX - dragRef.current.startX);
            setLeftW(Math.max(260, Math.min(600, newW)));
        };
        const onUp = () => { dragRef.current.active = false; document.body.style.cursor = ""; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, []);

    // ── WebSocket ──
    useEffect(() => {
        function connect() {
            const s = new WebSocket(`ws://${AGENT_SERVER}:8003/ws/agent`);
            s.onopen = () => setConnected(true);
            s.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
            s.onerror = () => s.close();
            s.onmessage = (m) => { try { setEvents(p => [...p, JSON.parse(m.data)]); } catch { } };
            ws.current = s;
        }
        connect();
        return () => { ws.current?.close(); };
    }, []);

    // ── Load sessions + status ──
    const loadStatus = useCallback(() => {
        fetch(api("/api/agent/sessions")).then(r => r.json()).then(setSessions).catch(() => { });
        fetch(api("/api/agent/status")).then(r => r.json()).then((s: AgentStatus) => {
            setStatus(s);
            setSchedTasks(s.scheduler?.tasks || []);
        }).catch(() => { });
    }, []);

    useEffect(() => { loadStatus(); }, [events.length, loadStatus]);

    // Auto-refresh status every 30s
    useEffect(() => {
        const interval = setInterval(loadStatus, 30000);
        return () => clearInterval(interval);
    }, [loadStatus]);

    // ── File browser ──
    const loadDir = useCallback((path: string) => {
        setFilePath(path); setFileContent(null); setFileViewing(null);
        const rel = path.replace("/opt/synthetica-lab", "").replace(/^\//, "");
        fetch(api(`/api/files/list?path=${encodeURIComponent(rel)}`))
            .then(r => r.json())
            .then(d => { if (d.entries) { setFileList(d.entries); setFilePath(d.path || path); } })
            .catch(() => { });
    }, []);

    const openFile = useCallback((path: string) => {
        setFileViewing(path); setFileContent(null);
        fetch(api(`/api/files/read?path=${encodeURIComponent(path)}`))
            .then(r => r.json())
            .then(d => { setFileContent(d.content || d.error || "Could not read"); })
            .catch(() => { });
    }, []);

    useEffect(() => { if (tab === "files" && fileList.length === 0) loadDir("/opt/synthetica-lab"); }, [tab, fileList.length, loadDir]);

    // ── Memory loader ──
    const loadMemory = useCallback(() => {
        fetch(api("/api/files/read?path=AGENT_STATE.md"))
            .then(r => r.json())
            .then(d => setAgentMemory(d.content || "Could not load AGENT_STATE.md"))
            .catch(() => setAgentMemory("Failed to fetch AGENT_STATE.md"));
    }, []);

    useEffect(() => { if (tab === "memory") loadMemory(); }, [tab, loadMemory]);

    // ── Sessions ──
    const loadSession = useCallback((sid: string) => {
        setSessionId(sid); setSelected(null);
        fetch(api(`/api/agent/timeline/${sid}?limit=500`))
            .then(r => r.json()).then(setEvents).catch(() => { });
    }, []);

    // ── Chat ──
    const send = useCallback(async () => {
        if (!input.trim() || busy) return;
        const msg = input.trim();
        setInput(""); setMessages(p => [...p, { role: "user", text: msg }]); setBusy(true);
        try {
            const res = await fetch(api("/api/agent/chat"), {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, session_id: sessionId, experiment: "EXP_002" }),
            });
            const data = await res.json();
            setSessionId(data.session_id);
            const ne: TEvent[] = data.events || [];
            setEvents(p => [...p, ...ne]);
            const last = ne.filter(e => e.event_type === "reasoning" && e.content).pop();
            if (last) setMessages(p => [...p, { role: "agent", text: last.content }]);
            setTimeout(() => { if (timelineRef.current) timelineRef.current.scrollLeft = timelineRef.current.scrollWidth; }, 100);
        } catch (e) {
            setMessages(p => [...p, { role: "agent", text: `Error: ${e}` }]);
        } finally { setBusy(false); }
    }, [input, busy, sessionId]);

    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // ── Scheduler actions ──
    const toggleTask = useCallback(async (name: string, enabled: boolean) => {
        const action = enabled ? "disable" : "enable";
        await fetch(api(`/api/scheduler/tasks/${name}/${action}`), { method: "POST" });
        loadStatus();
    }, [loadStatus]);

    const deleteTask = useCallback(async (name: string) => {
        await fetch(api(`/api/scheduler/tasks/${name}`), { method: "DELETE" });
        loadStatus();
    }, [loadStatus]);

    const addTask = useCallback(async () => {
        if (!newTask.name || !newTask.message) return;
        await fetch(api("/api/scheduler/tasks"), {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newTask.name, message: newTask.message, interval_seconds: parseInt(newTask.interval) || 3600 }),
        });
        setNewTask({ name: "", message: "", interval: "3600" });
        setShowAddTask(false);
        loadStatus();
    }, [newTask, loadStatus]);

    const filtered = events.filter(e => fType === "all" || e.event_type === fType);
    const agents = [...new Set(events.map(e => e.agent_id))];
    const activeAgents = status ? Object.entries(status.agents || {}) : [];

    // Get first agent info for status bar
    const firstAgent = activeAgents.length > 0 ? activeAgents[0][1] : null;

    // Parse reflections from memory
    const reflections = useMemo(() => {
        if (!agentMemory) return [];
        const parts = agentMemory.split(/---\s*\n+### Reflection/);
        return parts.slice(1).map(p => "### Reflection" + p).slice(-5).reverse();
    }, [agentMemory]);

    // Next scheduled task time
    const nextTaskIn = useMemo(() => {
        const enabled = schedTasks.filter(t => t.enabled && t.last_run);
        if (enabled.length === 0) return null;
        const times = enabled.map(t => {
            const lastRun = new Date(t.last_run!).getTime();
            const nextRun = lastRun + t.interval_seconds * 1000;
            return nextRun - Date.now();
        });
        const min = Math.min(...times);
        if (min < 0) return "due";
        if (min < 60000) return "<1m";
        if (min < 3600000) return `${Math.floor(min / 60000)}m`;
        return `${Math.floor(min / 3600000)}h`;
    }, [schedTasks]);

    return (
        <div className="flex h-screen bg-background text-foreground" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

            {/* ── Left Panel ── */}
            <aside className="flex flex-col border-r border-border bg-sidebar" style={{ width: leftW, minWidth: leftW }}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Bot size={14} className={connected ? "text-green-400" : "text-red-400"} />
                        <span className="text-[13px] font-semibold">Lab Agent</span>
                    </div>
                    <a href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        <ArrowLeft size={10} /> Experiments
                    </a>
                </div>

                {/* ── Status Bar ── */}
                <div className="border-b border-border px-3 py-2 space-y-1.5">
                    {/* Models */}
                    <div className="flex items-center gap-1 flex-wrap">
                        <Cpu size={10} className="text-muted-foreground/50" />
                        {firstAgent ? (
                            <>
                                <span className="text-[9px] font-mono px-1 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{firstAgent.model}</span>
                                {firstAgent.coder_model && (
                                    <span className="text-[9px] font-mono px-1 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">{firstAgent.coder_model}</span>
                                )}
                                {firstAgent.gemini_model && (
                                    <span className="text-[9px] font-mono px-1 py-0.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">{firstAgent.gemini_model}</span>
                                )}
                            </>
                        ) : (
                            <span className="text-[9px] text-muted-foreground/40">No agent running</span>
                        )}
                    </div>
                    {/* Feature flags */}
                    <div className="flex items-center gap-2 text-[9px]">
                        <span className={`flex items-center gap-0.5 ${firstAgent?.planner_enabled ? "text-green-400" : "text-muted-foreground/30"}`}>
                            <Sparkles size={8} /> Planner
                        </span>
                        <span className={`flex items-center gap-0.5 ${status?.telegram?.enabled ? "text-green-400" : "text-muted-foreground/30"}`}>
                            <MessageCircle size={8} /> Telegram{status?.telegram?.chat_id ? ` ✓` : ""}
                        </span>
                        {nextTaskIn && (
                            <span className="flex items-center gap-0.5 text-muted-foreground/60">
                                <Calendar size={8} /> {nextTaskIn}
                            </span>
                        )}
                    </div>
                </div>

                {/* Active agents */}
                {activeAgents.length > 0 && (
                    <div className="border-b border-border">
                        <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">Active Agents</div>
                        {activeAgents.map(([sid, info]) => {
                            const a = info;
                            return (
                                <button key={sid} onClick={() => loadSession(sid)}
                                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors flex items-center gap-2 ${sessionId === sid ? "bg-accent" : "hover:bg-muted/20"}`}>
                                    <Circle size={6} className={a.is_running ? "text-green-400 fill-green-400" : "text-zinc-500 fill-zinc-500"} />
                                    <span className="font-mono flex-1 truncate">{sid}</span>
                                    <span className="text-muted-foreground/50">{a.event_count} ev</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Sessions */}
                {sessions.length > 0 && (
                    <div className="border-b border-border max-h-28 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                            <span>Sessions</span>
                            <span className="text-muted-foreground/40">{sessions.length}</span>
                        </div>
                        {sessions.map(s => (
                            <button key={s.session_id} onClick={() => loadSession(s.session_id)}
                                className={`w-full text-left px-3 py-1 text-[11px] transition-colors flex items-center gap-2 ${sessionId === s.session_id ? "bg-accent" : "hover:bg-muted/20"}`}>
                                <Clock size={10} className="text-muted-foreground/40" />
                                <span className="font-mono flex-1 truncate">{s.session_id}</span>
                                <span className="text-muted-foreground/40">{fmtAge(s.last_event)}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground/30 text-xs mt-16 space-y-1">
                            <Bot size={20} className="mx-auto mb-2 opacity-30" />
                            <div>Ask the agent anything</div>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[90%] rounded-md px-2.5 py-2 text-[12px] leading-relaxed ${m.role === "user"
                                ? "bg-foreground/5 border border-border/50"
                                : "bg-transparent"}`}>
                                {m.role === "agent" ? <MdRender text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                            </div>
                        </div>
                    ))}
                    {busy && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 px-1">
                            <Loader2 size={12} className="animate-spin" /> Thinking…
                        </div>
                    )}
                    <div ref={chatEnd} />
                </div>

                {/* Input */}
                <div className="px-2.5 py-2 border-t border-border">
                    <div className="flex gap-1">
                        <input type="text" value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                            placeholder="Message…"
                            disabled={busy}
                            className="flex-1 bg-transparent border border-border rounded-md px-2.5 py-1.5 text-[12px] outline-none focus:border-foreground/20 transition-colors placeholder:text-muted-foreground/30" />
                        <button onClick={send} disabled={busy || !input.trim()}
                            className="px-2 py-1.5 border border-border hover:bg-foreground/5 disabled:opacity-20 rounded-md transition-colors">
                            <Send size={12} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Resize handle ── */}
            <div className="w-px bg-border relative group cursor-col-resize"
                onMouseDown={e => { dragRef.current = { active: true, startX: e.clientX, startW: leftW }; document.body.style.cursor = "col-resize"; }}>
                <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500/20 transition-colors" />
            </div>

            {/* ── Right Panel ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Tab bar */}
                <div className="flex items-center px-3 py-1.5 border-b border-border gap-1">
                    <button onClick={() => setTab("timeline")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${tab === "timeline" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <GitBranch size={12} /> Timeline
                    </button>
                    <button onClick={() => setTab("scheduler")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${tab === "scheduler" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <Calendar size={12} /> Scheduler
                        {schedTasks.filter(t => t.enabled).length > 0 && (
                            <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded">{schedTasks.filter(t => t.enabled).length}</span>
                        )}
                    </button>
                    <button onClick={() => setTab("memory")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${tab === "memory" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <BookOpen size={12} /> Memory
                    </button>
                    <button onClick={() => setTab("files")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${tab === "files" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <FolderTree size={12} /> Files
                    </button>
                    <div className="flex-1" />
                    {tab === "timeline" && (
                        <>
                            <select value={fType} onChange={e => setFType(e.target.value)}
                                className="text-[11px] bg-transparent border border-border rounded-md px-1.5 py-0.5 text-muted-foreground outline-none">
                                <option value="all">All events</option>
                                <option value="reasoning">Reasoning</option>
                                <option value="tool_call">Tool calls</option>
                                <option value="error">Errors</option>
                                <option value="decision">Decisions</option>
                            </select>
                            <span className="text-[10px] text-muted-foreground/40 font-mono ml-1">{filtered.length}</span>
                        </>
                    )}
                </div>

                {/* ── Timeline Tab ── */}
                {tab === "timeline" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Horizontal timeline with branching */}
                        <div ref={timelineRef} className="border-b border-border overflow-x-auto overflow-y-hidden" style={{ minHeight: agents.length > 0 ? agents.length * 48 + 16 : 72 }}>
                            {agents.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/30">
                                    <MessageSquare size={14} className="mr-1.5 opacity-30" /> Waiting for events…
                                </div>
                            ) : (
                                <div className="px-3 py-2">
                                    {agents.map((aid, ai) => {
                                        const ae = filtered.filter(e => e.agent_id === aid);
                                        if (!ae.length) return null;
                                        return (
                                            <div key={aid} className="flex items-center gap-1.5 h-10 mb-1">
                                                <div className="w-16 flex-shrink-0 flex items-center gap-1 pr-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ai === 0 ? "bg-blue-400" : ai === 1 ? "bg-emerald-400" : "bg-amber-400"}`} />
                                                    <span className="text-[10px] text-muted-foreground truncate">{aid}</span>
                                                </div>
                                                <div className="flex items-center flex-1 relative">
                                                    <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-border" />
                                                    <div className="flex items-center gap-0.5 relative z-10">
                                                        {ae.map((e, ei) => {
                                                            const cfg = EVT[e.event_type] || EVT.info;
                                                            const Icon = cfg.icon;
                                                            const isSelected = selected?.id === e.id;
                                                            return (
                                                                <div key={e.id} className="flex items-center">
                                                                    {ei > 0 && <div className="w-4 h-px bg-border" />}
                                                                    <button onClick={() => setSelected(e)}
                                                                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all border
                                      ${isSelected
                                                                                ? "border-foreground/40 bg-foreground/10 scale-110"
                                                                                : "border-border bg-background hover:border-foreground/20 hover:bg-foreground/5"}`}
                                                                        title={`${e.title} — ${fmtTime(e.timestamp)}`}>
                                                                        <Icon size={11} className={cfg.color} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Event detail / list */}
                        <div className="flex-1 overflow-y-auto">
                            {selected ? (
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {(() => { const cfg = EVT[selected.event_type] || EVT.info; const Icon = cfg.icon; return <Icon size={14} className={cfg.color} />; })()}
                                            <span className="text-[13px] font-medium">{selected.title}</span>
                                            {selected.duration_ms != null && <span className="text-[11px] text-muted-foreground font-mono">{fmtDur(selected.duration_ms)}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground font-mono">{fmtTime(selected.timestamp)}</span>
                                            <button onClick={() => setSelected(null)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    {selected.content && (
                                        <pre className="text-[12px] font-mono bg-muted/10 border border-border rounded-md p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                            {selected.content}
                                        </pre>
                                    )}
                                    {selected.tool_input && (
                                        <div>
                                            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">Input</div>
                                            <pre className="text-[11px] font-mono bg-muted/10 rounded-md p-2 overflow-x-auto border border-border">
                                                {JSON.stringify(selected.tool_input, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {selected.tool_output && (
                                        <div>
                                            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">Output</div>
                                            <pre className="text-[11px] font-mono bg-muted/10 rounded-md p-2 max-h-60 overflow-y-auto border border-border">
                                                {selected.tool_output}
                                            </pre>
                                        </div>
                                    )}
                                    {selected.files_touched.length > 0 && (
                                        <div className="flex gap-1 flex-wrap items-center">
                                            <File size={10} className="text-muted-foreground/40" />
                                            {selected.files_touched.map((f, i) => (
                                                <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-muted/20 rounded border border-border/50">{f.split("/").pop()}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : filtered.length > 0 ? (
                                <div className="py-1">
                                    {filtered.map(e => {
                                        const cfg = EVT[e.event_type] || EVT.info;
                                        const Icon = cfg.icon;
                                        return (
                                            <button key={e.id} onClick={() => setSelected(e)}
                                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-muted/10 transition-colors text-[11px]">
                                                <Icon size={11} className={cfg.color} />
                                                <span className="flex-1 truncate text-foreground/60">{e.title}</span>
                                                {e.tool_name && <span className="text-[10px] font-mono text-muted-foreground/30">{e.tool_name}</span>}
                                                {e.duration_ms != null && <span className="text-[10px] font-mono text-muted-foreground/20">{fmtDur(e.duration_ms)}</span>}
                                                <span className="text-[10px] font-mono text-muted-foreground/20">{fmtTime(e.timestamp)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground/20 text-[11px]">
                                    Send a message to begin
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Scheduler Tab ── */}
                {tab === "scheduler" && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-[13px] font-medium flex items-center gap-2">
                                    <Calendar size={14} className="text-muted-foreground" />
                                    Scheduled Tasks
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={loadStatus}
                                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/10">
                                        <RefreshCw size={12} />
                                    </button>
                                    <button onClick={() => setShowAddTask(!showAddTask)}
                                        className="text-[11px] flex items-center gap-1 px-2 py-1 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-md transition-colors">
                                        <Plus size={11} /> Add
                                    </button>
                                </div>
                            </div>

                            {/* Add task form */}
                            {showAddTask && (
                                <div className="border border-border rounded-md p-3 space-y-2 bg-muted/5">
                                    <input type="text" placeholder="Task name (e.g. check_sensor)"
                                        value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                                        className="w-full bg-transparent border border-border rounded-md px-2.5 py-1.5 text-[12px] outline-none focus:border-foreground/20" />
                                    <textarea placeholder="Message to send to the agent…"
                                        value={newTask.message} onChange={e => setNewTask(p => ({ ...p, message: e.target.value }))}
                                        className="w-full bg-transparent border border-border rounded-md px-2.5 py-1.5 text-[12px] outline-none focus:border-foreground/20 h-16 resize-none" />
                                    <div className="flex items-center gap-2">
                                        <select value={newTask.interval} onChange={e => setNewTask(p => ({ ...p, interval: e.target.value }))}
                                            className="text-[12px] bg-transparent border border-border rounded-md px-2 py-1 outline-none">
                                            <option value="300">5 min</option>
                                            <option value="900">15 min</option>
                                            <option value="1800">30 min</option>
                                            <option value="3600">1 hour</option>
                                            <option value="7200">2 hours</option>
                                            <option value="21600">6 hours</option>
                                            <option value="43200">12 hours</option>
                                            <option value="86400">24 hours</option>
                                        </select>
                                        <div className="flex-1" />
                                        <button onClick={() => setShowAddTask(false)}
                                            className="text-[11px] px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                        <button onClick={addTask} disabled={!newTask.name || !newTask.message}
                                            className="text-[11px] px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30 rounded-md transition-colors">Create</button>
                                    </div>
                                </div>
                            )}

                            {/* Task list */}
                            {schedTasks.length === 0 ? (
                                <div className="text-center text-muted-foreground/30 text-[12px] py-12">
                                    No scheduled tasks
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {schedTasks.map(task => (
                                        <div key={task.name} className="flex items-start gap-3 p-3 border border-border rounded-md hover:bg-muted/5 transition-colors">
                                            {/* Toggle */}
                                            <button onClick={() => toggleTask(task.name, task.enabled)} className="mt-0.5">
                                                {task.enabled
                                                    ? <ToggleRight size={18} className="text-green-400" />
                                                    : <ToggleLeft size={18} className="text-muted-foreground/30" />
                                                }
                                            </button>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[12px] font-medium ${task.enabled ? "text-foreground" : "text-muted-foreground/50"}`}>{task.name}</span>
                                                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-muted/20 text-muted-foreground rounded">{task.interval_human}</span>
                                                </div>
                                                <p className={`text-[11px] mt-0.5 line-clamp-2 ${task.enabled ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                                                    {task.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground/40">
                                                    {task.last_run && <span>Last: {fmtAge(task.last_run)} ago</span>}
                                                    <span>Runs: {task.run_count}</span>
                                                </div>
                                            </div>
                                            {/* Delete */}
                                            <button onClick={() => deleteTask(task.name)}
                                                className="text-muted-foreground/20 hover:text-red-400 transition-colors mt-0.5">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Memory Tab ── */}
                {tab === "memory" && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[13px] font-medium flex items-center gap-2">
                                    <BookOpen size={14} className="text-muted-foreground" />
                                    Agent Memory (AGENT_STATE.md)
                                </div>
                                <button onClick={loadMemory}
                                    className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded hover:bg-muted/10">
                                    <RefreshCw size={12} />
                                </button>
                            </div>

                            {/* Recent reflections */}
                            {reflections.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles size={10} /> Recent Reflections ({reflections.length})
                                    </div>
                                    {reflections.map((r, i) => (
                                        <div key={i} className="border border-border rounded-md p-3 bg-purple-500/5 border-purple-500/10">
                                            <MdRender text={r} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Full content */}
                            {agentMemory ? (
                                <div className="border border-border rounded-md p-4">
                                    <MdRender text={agentMemory} />
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                                    <Loader2 size={12} className="animate-spin" /> Loading…
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Files Tab ── */}
                {tab === "files" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Breadcrumb */}
                        <div className="px-3 py-1.5 border-b border-border flex items-center gap-1 text-[11px]">
                            {filePath.split("/").filter(Boolean).map((part, i, arr) => {
                                const path = "/" + arr.slice(0, i + 1).join("/");
                                return (
                                    <span key={i} className="flex items-center gap-1">
                                        {i > 0 && <ChevronRight size={10} className="text-muted-foreground/30" />}
                                        <button onClick={() => loadDir(path)} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-24">
                                            {part}
                                        </button>
                                    </span>
                                );
                            })}
                            <div className="flex-1" />
                            <button onClick={() => loadDir(filePath)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                                <RefreshCw size={11} />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* File list */}
                            <div className="w-56 border-r border-border overflow-y-auto flex-shrink-0">
                                {fileList.length === 0 ? (
                                    <div className="px-3 py-8 text-[11px] text-muted-foreground/30 text-center">Loading…</div>
                                ) : (
                                    <div className="py-0.5">
                                        {fileList.filter(f => f.is_dir).sort((a, b) => a.name.localeCompare(b.name)).map(f => (
                                            <button key={f.name} onClick={() => loadDir(`${filePath}/${f.name}`)}
                                                className="w-full text-left px-2.5 py-1 text-[11px] hover:bg-muted/10 transition-colors flex items-center gap-1.5">
                                                <Folder size={12} className="text-blue-400/50 flex-shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </button>
                                        ))}
                                        {fileList.filter(f => !f.is_dir).sort((a, b) => a.name.localeCompare(b.name)).map(f => (
                                            <button key={f.name} onClick={() => openFile(`${filePath}/${f.name}`)}
                                                className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-muted/10 transition-colors flex items-center gap-1.5
                          ${fileViewing === `${filePath}/${f.name}` ? "bg-accent text-accent-foreground" : ""}`}>
                                                <File size={12} className="text-muted-foreground/30 flex-shrink-0" />
                                                <span className="truncate flex-1">{f.name}</span>
                                                <span className="text-[9px] text-muted-foreground/25 font-mono">{fmtSize(f.size)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* File content */}
                            <div className="flex-1 overflow-auto">
                                {fileViewing ? (
                                    <div className="p-4">
                                        <div className="text-[11px] text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                                            <File size={11} className="text-muted-foreground/40" />
                                            {fileViewing.split("/").pop()}
                                        </div>
                                        {fileContent === null ? (
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                                                <Loader2 size={12} className="animate-spin" /> Loading…
                                            </div>
                                        ) : fileViewing.endsWith(".md") ? (
                                            <MdRender text={fileContent} />
                                        ) : (
                                            <pre className="text-[11px] font-mono bg-muted/5 border border-border rounded-md p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                                {fileContent}
                                            </pre>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground/20">
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
