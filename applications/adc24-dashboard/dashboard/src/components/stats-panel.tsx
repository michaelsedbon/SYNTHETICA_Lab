"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsPanelProps {
    connected: boolean;
    recording: boolean;
    sampleCount: number;
    peakCount: number;
    elapsedS: number;
    spikeFreqHz: number;
    latestUv: number;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function StatsPanel({
    connected,
    recording,
    sampleCount,
    peakCount,
    elapsedS,
    spikeFreqHz,
    latestUv,
}: StatsPanelProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* Connection status */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Device
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <Badge
                        variant={connected ? "default" : "secondary"}
                        className={
                            connected
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }
                    >
                        {connected ? "Connected" : "Disconnected"}
                    </Badge>
                </CardContent>
            </Card>

            {/* Recording status */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <Badge
                        className={
                            recording
                                ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }
                    >
                        {recording ? "● Recording" : "Idle"}
                    </Badge>
                </CardContent>
            </Card>

            {/* Elapsed time */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Duration
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <p className="text-lg font-mono text-zinc-100">
                        {formatDuration(elapsedS)}
                    </p>
                </CardContent>
            </Card>

            {/* Sample count */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Samples
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <p className="text-lg font-mono text-zinc-100">
                        {sampleCount.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            {/* Peak count */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Peaks
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <p className="text-lg font-mono text-amber-400">
                        {peakCount.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            {/* Spike frequency */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Spike Rate
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <p className="text-lg font-mono text-zinc-100">
                        {spikeFreqHz.toFixed(3)}{" "}
                        <span className="text-xs text-zinc-500">Hz</span>
                    </p>
                </CardContent>
            </Card>

            {/* Latest voltage */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                        Latest
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <p className="text-lg font-mono text-emerald-400">
                        {latestUv.toFixed(1)}{" "}
                        <span className="text-xs text-zinc-500">µV</span>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
