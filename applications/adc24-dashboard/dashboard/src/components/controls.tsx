"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface ControlsProps {
    connected: boolean;
    recording: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onStartRecording: (params: {
        channel: number;
        voltage_range: string;
        differential: boolean;
        mains_50hz: boolean;
    }) => void;
    onStopRecording: () => void;
    onStartDemo: () => void;
    // Config state
    channel: number;
    setChannel: (ch: number) => void;
    voltageRange: string;
    setVoltageRange: (vr: string) => void;
    differential: boolean;
    setDifferential: (d: boolean) => void;
    mains50hz: boolean;
    setMains50hz: (m: boolean) => void;
}

export function Controls({
    connected,
    recording,
    onConnect,
    onDisconnect,
    onStartRecording,
    onStopRecording,
    onStartDemo,
    channel,
    setChannel,
    voltageRange,
    setVoltageRange,
    differential,
    setDifferential,
    mains50hz,
    setMains50hz,
}: ControlsProps) {
    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 uppercase tracking-wider">
                    Controls
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Connection */}
                <div className="flex gap-2">
                    {!connected ? (
                        <Button
                            onClick={onConnect}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={recording}
                        >
                            Connect ADC-24
                        </Button>
                    ) : (
                        <Button
                            onClick={onDisconnect}
                            variant="outline"
                            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            disabled={recording}
                        >
                            Disconnect
                        </Button>
                    )}
                </div>

                <Separator className="bg-zinc-800" />

                {/* Channel config */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider">
                            Channel
                        </label>
                        <Select
                            value={String(channel)}
                            onValueChange={(v) => setChannel(Number(v))}
                            disabled={recording}
                        >
                            <SelectTrigger className="w-20 h-8 bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((ch) => (
                                    <SelectItem key={ch} value={String(ch)} className="text-zinc-200 text-xs">
                                        Ch {ch}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider">
                            Range (mV)
                        </label>
                        <Select
                            value={voltageRange}
                            onValueChange={setVoltageRange}
                            disabled={recording}
                        >
                            <SelectTrigger className="w-20 h-8 bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                {["39", "78", "156", "312", "625", "1250", "2500"].map((r) => (
                                    <SelectItem key={r} value={r} className="text-zinc-200 text-xs">
                                        ±{r}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider">
                            Differential
                        </label>
                        <Switch
                            checked={differential}
                            onCheckedChange={setDifferential}
                            disabled={recording}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider">
                            50 Hz Rejection
                        </label>
                        <Switch
                            checked={mains50hz}
                            onCheckedChange={setMains50hz}
                            disabled={recording}
                        />
                    </div>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Record / Stop */}
                <div className="space-y-2">
                    {!recording ? (
                        <>
                            <Button
                                onClick={() =>
                                    onStartRecording({
                                        channel,
                                        voltage_range: voltageRange,
                                        differential,
                                        mains_50hz: mains50hz,
                                    })
                                }
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
                                disabled={!connected}
                            >
                                ● Start Recording
                            </Button>
                            <Button
                                onClick={onStartDemo}
                                variant="outline"
                                className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs"
                            >
                                ▶ Demo Mode (no hardware)
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={onStopRecording}
                            variant="outline"
                            className="w-full border-red-800 text-red-400 hover:bg-red-950"
                        >
                            ■ Stop Recording
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
