"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LiveChart } from "@/components/live-chart";
import { StatsPanel } from "@/components/stats-panel";
import { Controls } from "@/components/controls";
import { SessionList } from "@/components/session-list";
import { Separator } from "@/components/ui/separator";
import {
  connectDevice,
  disconnectDevice,
  startRecording,
  startDemo,
  stopRecording,
  createWebSocket,
  type StreamMessage,
} from "@/lib/api";

// Maximum data points to keep in memory (≈5 minutes at 10 S/s)
const MAX_POINTS = 3000;

export default function Dashboard() {
  // Connection / recording state
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionRefresh, setSessionRefresh] = useState(0);

  // Config state — paper defaults
  const [channel, setChannel] = useState(1);
  const [voltageRange, setVoltageRange] = useState("39");
  const [differential, setDifferential] = useState(true);
  const [mains50hz, setMains50hz] = useState(true);

  // Chart data (accumulated)
  const [times, setTimes] = useState<number[]>([]);
  const [rawUv, setRawUv] = useState<number[]>([]);
  const [filteredUv, setFilteredUv] = useState<number[]>([]);
  const [peaks, setPeaks] = useState<
    Array<{ time: number; height_uv: number; width_s: number; polarity: string }>
  >([]);

  // Stats
  const [stats, setStats] = useState({
    sampleCount: 0,
    peakCount: 0,
    elapsedS: 0,
    spikeFreqHz: 0,
    latestUv: 0,
  });

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // --- WebSocket connection ---
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = createWebSocket();

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg: StreamMessage = JSON.parse(event.data);
          if (msg.type === "pong") return;
          if (msg.type !== "data") return;

          // Append new data points, keeping a rolling window
          setTimes((prev) => {
            const next = [...prev, ...msg.times];
            return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
          });
          setRawUv((prev) => {
            const next = [...prev, ...msg.raw_uv];
            return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
          });
          setFilteredUv((prev) => {
            const next = [...prev, ...msg.filtered_uv];
            return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
          });
          setPeaks((prev) => {
            const next = [...prev, ...msg.peaks];
            // Keep only peaks in the visible time window
            const cutoff = msg.times.length > 0 ? msg.times[0] - 120 : 0;
            return next.filter((p) => p.time > cutoff);
          });

          // Update stats
          setStats({
            sampleCount: msg.stats.sample_count,
            peakCount: msg.stats.peak_count,
            elapsedS: msg.stats.elapsed_s,
            spikeFreqHz: msg.stats.spike_freq_hz,
            latestUv: msg.stats.latest_uv,
          });
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        // Reconnect after 2s if still recording
        if (recording) {
          reconnectTimer.current = setTimeout(connectWs, 2000);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
    }
  }, [recording]);

  // Connect WebSocket when recording starts
  useEffect(() => {
    if (recording) {
      connectWs();
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [recording, connectWs]);

  // Ping to keep alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleConnect = async () => {
    setError(null);
    try {
      await connectDevice();
      setConnected(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await disconnectDevice();
      setConnected(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    }
  };

  const handleStartRecording = async (params: {
    channel: number;
    voltage_range: string;
    differential: boolean;
    mains_50hz: boolean;
  }) => {
    setError(null);
    // Clear previous data
    setTimes([]);
    setRawUv([]);
    setFilteredUv([]);
    setPeaks([]);
    setStats({ sampleCount: 0, peakCount: 0, elapsedS: 0, spikeFreqHz: 0, latestUv: 0 });

    try {
      await startRecording(params);
      setRecording(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start recording");
    }
  };

  const handleStartDemo = async () => {
    setError(null);
    setTimes([]);
    setRawUv([]);
    setFilteredUv([]);
    setPeaks([]);
    setStats({ sampleCount: 0, peakCount: 0, elapsedS: 0, spikeFreqHz: 0, latestUv: 0 });

    try {
      const res = await startDemo();
      setRecording(true);
      setConnected(true); // Demo mode acts as connected
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start demo");
    }
  };

  const handleStopRecording = async () => {
    setError(null);
    try {
      await stopRecording();
      setRecording(false);
      // Close WebSocket
      wsRef.current?.close();
      wsRef.current = null;
      // Refresh session list
      setSessionRefresh((n) => n + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to stop recording");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              <span className="text-emerald-400">⚡</span> ADC-24 Electrophysiology
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              EXP_001 — <em>Pleurotus eryngii</em> mycelium signal recording
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600 font-mono">
              Pico Log ADC-24 · 24-bit · ±{voltageRange} mV · Ch{channel}
              {differential ? " DIFF" : " SE"}
            </span>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-4">
        {/* Error banner */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 rounded-lg px-4 py-2 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats bar */}
        <StatsPanel
          connected={connected}
          recording={recording}
          sampleCount={stats.sampleCount}
          peakCount={stats.peakCount}
          elapsedS={stats.elapsedS}
          spikeFreqHz={stats.spikeFreqHz}
          latestUv={stats.latestUv}
        />

        <Separator className="bg-zinc-800" />

        {/* Main content: chart + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Chart area */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 min-h-[400px]">
            <LiveChart
              times={times}
              rawUv={rawUv}
              filteredUv={filteredUv}
              peaks={peaks}
              windowSeconds={30}
            />
          </div>

          {/* Sidebar: controls + sessions */}
          <div className="space-y-4">
            <Controls
              connected={connected}
              recording={recording}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onStartDemo={handleStartDemo}
              channel={channel}
              setChannel={setChannel}
              voltageRange={voltageRange}
              setVoltageRange={setVoltageRange}
              differential={differential}
              setDifferential={setDifferential}
              mains50hz={mains50hz}
              setMains50hz={setMains50hz}
            />
            <SessionList refreshKey={sessionRefresh} />
          </div>
        </div>
      </main>
    </div>
  );
}
