"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Config ── Agent always runs on the server
const AGENT_SERVER = "172.16.1.80";
function agentBase(): string {
    return `http://${AGENT_SERVER}:8003`;
}

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
    size_bytes: number;
}

// ── Event type config ──
const EVENT_COLORS: Record<string, { bg: string; border: string; icon: string; label: string }> = {
    reasoning: { bg: "bg-blue-500/20", border: "border-blue-500/40", icon: "💭", label: "Reasoning" },
    tool_call: { bg: "bg-amber-500/20", border: "border-amber-500/40", icon: "🔧", label: "Tool Call" },
    observation: { bg: "bg-green-500/20", border: "border-green-500/40", icon: "📊", label: "Observation" },
    decision: { bg: "bg-purple-500/20", border: "border-purple-500/40", icon: "✅", label: "Decision" },
    error: { bg: "bg-red-500/20", border: "border-red-500/40", icon: "⚠️", label: "Error" },
    info: { bg: "bg-slate-500/20", border: "border-slate-500/40", icon: "ℹ️", label: "Info" },
};

const AGENT_COLORS: Record<string, string> = {
    default: "bg-blue-500",
    planner: "bg-violet-500",
    operator: "bg-emerald-500",
    analyst: "bg-amber-500",
};

// ── Helpers ──
function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch {
        return iso;
    }
}

function formatDuration(ms?: number): string {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function relativeTime(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return "just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    } catch {
        return iso;
    }
}

// ── Components ──

function EventNode({
    event,
    isSelected,
    onClick,
}: {
    event: TimelineEvent;
    isSelected: boolean;
    onClick: () => void;
}) {
    const config = EVENT_COLORS[event.event_type] || EVENT_COLORS.info;
    return (
        <button
            onClick={onClick}
            className={`
        relative flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all duration-200
        flex items-center justify-center text-sm
        ${config.bg} ${config.border}
        ${isSelected ? "ring-2 ring-blue-400 scale-110" : "hover:scale-105 hover:brightness-125"}
      `}
            title={`${config.icon} ${event.title} — ${formatTime(event.timestamp)}`}
        >
            <span className="text-xs">{config.icon}</span>
        </button>
    );
}

function EventDetail({ event }: { event: TimelineEvent }) {
    const config = EVENT_COLORS[event.event_type] || EVENT_COLORS.info;
    return (
        <div className={`rounded-lg border ${config.border} ${config.bg} p-4 text-sm`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">{config.icon}</span>
                    <span className="font-semibold text-foreground">{event.title}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50">
                        {config.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {event.duration_ms !== undefined && (
                        <span className="font-mono">{formatDuration(event.duration_ms)}</span>
                    )}
                    <span className="font-mono">{formatTime(event.timestamp)}</span>
                </div>
            </div>

            {/* Content */}
            {event.content && (
                <div className="mb-3 text-foreground/80 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-background/30 rounded p-3">
                    {event.content}
                </div>
            )}

            {/* Tool details */}
            {event.tool_name && (
                <div className="space-y-2">
                    {event.tool_input && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Input</div>
                            <pre className="text-xs font-mono bg-background/30 rounded p-2 overflow-x-auto">
                                {JSON.stringify(event.tool_input, null, 2)}
                            </pre>
                        </div>
                    )}
                    {event.tool_output && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Output</div>
                            <pre className="text-xs font-mono bg-background/30 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                                {event.tool_output}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Files touched */}
            {event.files_touched.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Files:</span>
                    {event.files_touched.map((f, i) => (
                        <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/50 text-foreground/70">
                            {f.split("/").pop()}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function ChatMessage({ role, content }: { role: string; content: string }) {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
            <div
                className={`
          max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm
          ${isUser
                        ? "bg-blue-600/30 border border-blue-500/30 text-foreground"
                        : "bg-muted/50 border border-border text-foreground/90"
                    }
        `}
            >
                <div className="whitespace-pre-wrap">{content}</div>
            </div>
        </div>
    );
}

// ── Main Page ──

export default function AgentPage() {
    // ── State ──
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [agentStatus, setAgentStatus] = useState<Record<string, unknown> | null>(null);
    const [connected, setConnected] = useState(false);

    // Filters
    const [filterAgent, setFilterAgent] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");

    const chatEndRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // ── WebSocket for real-time events ──
    useEffect(() => {
        function connect() {
            const ws = new WebSocket(`ws://${AGENT_SERVER}:8003/ws/agent`);
            ws.onopen = () => setConnected(true);
            ws.onclose = () => {
                setConnected(false);
                setTimeout(connect, 3000);
            };
            ws.onerror = () => ws.close();
            ws.onmessage = (msg) => {
                try {
                    const event: TimelineEvent = JSON.parse(msg.data);
                    setEvents((prev) => [...prev, event]);
                    // Auto-scroll timeline
                    setTimeout(() => {
                        if (timelineRef.current) {
                            timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
                        }
                    }, 50);
                } catch {/* ignore */ }
            };
            wsRef.current = ws;
        }
        connect();
        return () => { wsRef.current?.close(); };
    }, []);

    // ── Load sessions ──
    useEffect(() => {
        fetch(`${agentBase()}/api/agent/sessions`)
            .then((r) => r.json())
            .then(setSessions)
            .catch(() => { });

        fetch(`${agentBase()}/api/agent/status`)
            .then((r) => r.json())
            .then(setAgentStatus)
            .catch(() => { });
    }, [events.length]);

    // ── Load session timeline ──
    const loadSession = useCallback((sid: string) => {
        setActiveSessionId(sid);
        setSelectedEvent(null);
        fetch(`${agentBase()}/api/agent/timeline/${sid}?limit=500`)
            .then((r) => r.json())
            .then((data: TimelineEvent[]) => {
                setEvents(data);
                setTimeout(() => {
                    if (timelineRef.current) {
                        timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
                    }
                }, 100);
            })
            .catch(() => { });
    }, []);

    // ── Send chat message ──
    const sendMessage = useCallback(async () => {
        if (!chatInput.trim() || isLoading) return;
        const msg = chatInput.trim();
        setChatInput("");
        setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${agentBase()}/api/agent/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: msg,
                    session_id: activeSessionId,
                    experiment: "EXP_002",
                }),
            });
            const data = await res.json();
            setActiveSessionId(data.session_id);

            // Find the final response (last reasoning event with content)
            const responseEvents: TimelineEvent[] = data.events || [];
            setEvents((prev) => [...prev, ...responseEvents]);

            const lastReasoning = responseEvents
                .filter((e: TimelineEvent) => e.event_type === "reasoning" && e.content)
                .pop();
            if (lastReasoning) {
                setChatMessages((prev) => [...prev, { role: "assistant", content: lastReasoning.content }]);
            }

            // Auto-scroll timeline
            setTimeout(() => {
                if (timelineRef.current) {
                    timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
                }
            }, 100);
        } catch (e) {
            setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [chatInput, isLoading, activeSessionId]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // ── Filter events ──
    const filteredEvents = events.filter((e) => {
        if (filterAgent !== "all" && e.agent_id !== filterAgent) return false;
        if (filterType !== "all" && e.event_type !== filterType) return false;
        return true;
    });

    // Group events by agent for multi-lane timeline
    const agentIds = [...new Set(events.map((e) => e.agent_id))];

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* ── Left Panel: Sessions + Chat ── */}
            <div className="w-[360px] flex flex-col border-r border-border bg-sidebar flex-shrink-0">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                            <h1 className="text-sm font-semibold">Lab Agent</h1>
                        </div>
                        <a
                            href="/"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Experiments
                        </a>
                    </div>
                    {agentStatus && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                            {Object.keys((agentStatus as { agents?: Record<string, unknown> }).agents || {}).length} active session(s)
                            {" · "}
                            {connected ? "WebSocket connected" : "Disconnected"}
                        </div>
                    )}
                </div>

                {/* Sessions list */}
                <div className="border-b border-border">
                    <div className="px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                        Sessions
                    </div>
                    <div className="max-h-[160px] overflow-y-auto">
                        {sessions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground/60">
                                No sessions yet. Start a conversation below.
                            </div>
                        ) : (
                            sessions.map((s) => (
                                <button
                                    key={s.session_id}
                                    onClick={() => loadSession(s.session_id)}
                                    className={`
                    w-full text-left px-4 py-2 text-xs transition-colors border-b border-border/30
                    ${activeSessionId === s.session_id
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-muted/40 text-foreground/70"
                                        }
                  `}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-medium">{s.session_id}</span>
                                        <span className="text-muted-foreground">{s.event_count} events</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {s.last_event ? relativeTime(s.last_event) : "—"}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    {chatMessages.length === 0 && (
                        <div className="text-center text-muted-foreground/50 text-xs mt-8">
                            <div className="text-2xl mb-2">🧪</div>
                            <div>Start a conversation with the Lab Agent</div>
                            <div className="mt-1 text-[10px]">Ask about experiments, control the machine, or plan research</div>
                        </div>
                    )}
                    {chatMessages.map((m, i) => (
                        <ChatMessage key={i} role={m.role} content={m.content} />
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-3">
                            <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="px-3 py-3 border-t border-border">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Ask the agent..."
                            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !chatInput.trim()}
                            className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Right Panel: Timeline + Details ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar / Filters */}
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-3 bg-sidebar/50">
                    <span className="text-xs text-muted-foreground">Filter:</span>
                    <select
                        value={filterAgent}
                        onChange={(e) => setFilterAgent(e.target.value)}
                        className="text-xs bg-muted/30 border border-border rounded px-2 py-1 text-foreground outline-none"
                    >
                        <option value="all">All agents</option>
                        {agentIds.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="text-xs bg-muted/30 border border-border rounded px-2 py-1 text-foreground outline-none"
                    >
                        <option value="all">All types</option>
                        {Object.entries(EVENT_COLORS).map(([k, v]) => (
                            <option key={k} value={k}>{v.icon} {v.label}</option>
                        ))}
                    </select>
                    <div className="flex-1" />
                    <span className="text-[11px] text-muted-foreground font-mono">
                        {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Horizontal Timeline */}
                <div className="border-b border-border bg-background/50">
                    {agentIds.length === 0 ? (
                        <div className="h-24 flex items-center justify-center text-xs text-muted-foreground/50">
                            No events yet — talk to the agent to get started
                        </div>
                    ) : (
                        <div className="py-3">
                            {agentIds.map((agentId) => {
                                const agentEvents = filteredEvents.filter((e) => e.agent_id === agentId);
                                if (agentEvents.length === 0) return null;
                                const dotColor = AGENT_COLORS[agentId] || "bg-blue-500";
                                return (
                                    <div key={agentId} className="flex items-center px-4 mb-2 last:mb-0">
                                        {/* Agent label */}
                                        <div className="w-20 flex-shrink-0 flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                                            <span className="text-[11px] text-muted-foreground font-medium truncate">{agentId}</span>
                                        </div>
                                        {/* Timeline track */}
                                        <div
                                            ref={timelineRef}
                                            className="flex-1 overflow-x-auto flex items-center gap-1.5 py-1 scrollbar-thin"
                                        >
                                            <div className="h-[2px] w-3 bg-border flex-shrink-0" />
                                            {agentEvents.map((event) => (
                                                <div key={event.id} className="flex items-center gap-1.5 flex-shrink-0">
                                                    <EventNode
                                                        event={event}
                                                        isSelected={selectedEvent?.id === event.id}
                                                        onClick={() => setSelectedEvent(event)}
                                                    />
                                                    <div className="h-[2px] w-3 bg-border" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Event Detail */}
                <div className="flex-1 overflow-y-auto p-4">
                    {selectedEvent ? (
                        <EventDetail event={selectedEvent} />
                    ) : filteredEvents.length > 0 ? (
                        <div className="space-y-2">
                            <div className="text-xs text-muted-foreground mb-3">
                                All events (click a node above for details)
                            </div>
                            {filteredEvents.map((e) => {
                                const config = EVENT_COLORS[e.event_type] || EVENT_COLORS.info;
                                return (
                                    <button
                                        key={e.id}
                                        onClick={() => setSelectedEvent(e)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50"
                                    >
                                        <span className="text-sm">{config.icon}</span>
                                        <span className="text-xs font-medium text-foreground/80 flex-1 truncate">{e.title}</span>
                                        {e.tool_name && (
                                            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded">
                                                {e.tool_name}
                                            </span>
                                        )}
                                        {e.duration_ms !== undefined && (
                                            <span className="text-[10px] font-mono text-muted-foreground">{formatDuration(e.duration_ms)}</span>
                                        )}
                                        <span className="text-[10px] font-mono text-muted-foreground/60">{formatTime(e.timestamp)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground/40">
                            <div className="text-center">
                                <div className="text-4xl mb-3">🤖</div>
                                <div className="text-sm">Ready to assist</div>
                                <div className="text-xs mt-1">Send a message to begin</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
