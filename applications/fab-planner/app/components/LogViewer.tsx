"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/app/components/ui/button";

interface LogEntry {
    id: string;
    category: string;
    level: string;
    action: string;
    details: string | null;
    partId: string | null;
    createdAt: string;
}

type LogTab = "user" | "app";

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
            " " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    } catch {
        return "—";
    }
}

function getLevelClass(level: string): string {
    switch (level) {
        case "error": return "log-error";
        case "warn": return "log-warn";
        default: return "log-info";
    }
}

export default function LogViewer({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<LogTab>("user");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch(`/api/logs?category=${activeTab}&limit=200`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        setLoading(true);
        fetchLogs();
    }, [fetchLogs]);

    // Auto-refresh every 3 seconds
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchLogs, 3000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, fetchLogs]);

    const handleClear = async () => {
        try {
            await fetch(`/api/logs?category=${activeTab}`, { method: "DELETE" });
            setLogs([]);
        } catch (err) {
            console.error("Failed to clear logs:", err);
        }
    };

    return (
        <div className="right-panel fade-in">
            <div className="panel-header">
                <h2>📋 Logs</h2>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <label className="auto-refresh-label">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto
                    </label>
                    <Button variant="destructive" size="sm" onClick={handleClear}>
                        Clear
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={onClose}>✕</Button>
                </div>
            </div>

            {/* Log category tabs */}
            <div className="tab-bar">
                <button
                    className={`tab ${activeTab === "user" ? "active" : ""}`}
                    onClick={() => setActiveTab("user")}
                >
                    👤 User Actions
                </button>
                <button
                    className={`tab ${activeTab === "app" ? "active" : ""}`}
                    onClick={() => setActiveTab("app")}
                >
                    🖥️ App Events
                </button>
            </div>

            <div className="log-container">
                {loading ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                        <p>Loading logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                        <div className="empty-icon">📭</div>
                        <p>No {activeTab} logs yet</p>
                    </div>
                ) : (
                    <div className="log-list">
                        {logs.map((log) => (
                            <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
                                <div className="log-time">{formatTime(log.createdAt)}</div>
                                <div className={`log-level-badge ${log.level}`}>{log.level}</div>
                                <div className="log-action">{log.action}</div>
                                {log.details && (
                                    <div className="log-details">{log.details}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
