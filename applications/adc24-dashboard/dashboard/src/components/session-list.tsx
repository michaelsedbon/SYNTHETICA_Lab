"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSessions, getSessionDownloadUrl, type SessionInfo } from "@/lib/api";

interface SessionListProps {
    /** Trigger re-fetch when this changes */
    refreshKey: number;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function SessionList({ refreshKey }: SessionListProps) {
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listSessions()
            .then((data) => {
                if (!cancelled) setSessions(data.sessions);
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 uppercase tracking-wider">
                    Recorded Sessions
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading && (
                    <p className="text-xs text-zinc-500">Loading…</p>
                )}
                {!loading && sessions.length === 0 && (
                    <p className="text-xs text-zinc-500">
                        No sessions recorded yet. Start a recording to create one.
                    </p>
                )}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="flex items-center justify-between py-2 px-3 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono text-zinc-200 truncate">
                                    {session.filename}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                        variant="secondary"
                                        className="bg-zinc-700/50 text-zinc-400 border-zinc-700 text-[10px]"
                                    >
                                        {formatBytes(session.size_bytes)}
                                    </Badge>
                                    <span className="text-[10px] text-zinc-500">
                                        {formatDate(session.created_at)}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 text-xs ml-2"
                                asChild
                            >
                                <a
                                    href={getSessionDownloadUrl(session.id)}
                                    download
                                >
                                    ↓ CSV
                                </a>
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
