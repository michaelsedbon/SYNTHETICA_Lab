"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Thermometer,
  Radio,
  Activity,
  RefreshCw,
} from "lucide-react";
import { SensorCard } from "@/components/sensor-card";
import { TemperatureChart } from "@/components/temperature-chart";
import {
  fetchSensors,
  fetchHistory,
  createWebSocket,
  type Sensor,
  type WsMessage,
  type HistoryResponse,
} from "@/lib/api";

type TimeRange = "24h" | "7d" | "30d";

export default function Dashboard() {
  // ── State ──
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // Chart data from WebSocket (live mode for 24h)
  const [liveTimestamps, setLiveTimestamps] = useState<number[]>([]);
  const [liveTemps, setLiveTemps] = useState<number[]>([]);
  const [liveHums, setLiveHums] = useState<number[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Initial fetch ──
  useEffect(() => {
    fetchSensors()
      .then(({ sensors }) => {
        setSensors(sensors);
        setBackendError(false);
        // Auto-select first sensor
        if (sensors.length > 0 && !selectedSensor) {
          setSelectedSensor(sensors[0].name);
        }
      })
      .catch(() => setBackendError(true));

    // Poll sensors every 30s for status updates
    pollRef.current = setInterval(() => {
      fetchSensors()
        .then(({ sensors }) => {
          setSensors(sensors);
          setBackendError(false);
        })
        .catch(() => setBackendError(true));
    }, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Fetch history when sensor or range changes ──
  useEffect(() => {
    if (!selectedSensor) return;

    setLoadingHistory(true);
    fetchHistory(selectedSensor, timeRange)
      .then((data) => {
        setHistory(data);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  }, [selectedSensor, timeRange]);

  // ── WebSocket ──
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = createWebSocket();

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          if (msg.type === "pong") return;

          if (msg.type === "init") {
            setMqttConnected(msg.mqtt_connected ?? false);
            // Initialize sensors from WS init data
            if (msg.sensors) {
              setSensors((prev) => {
                const updated = [...prev];
                for (const [name, readings] of Object.entries(msg.sensors!)) {
                  const idx = updated.findIndex((s) => s.name === name);
                  if (idx >= 0) {
                    updated[idx] = { ...updated[idx], latest: readings };
                  }
                }
                return updated;
              });
            }
            return;
          }

          if (msg.type === "reading" && msg.sensor && msg.metric && msg.value !== undefined) {
            // Update sensor latest
            setSensors((prev) =>
              prev.map((s) =>
                s.name === msg.sensor
                  ? {
                      ...s,
                      online: true,
                      last_seen: msg.timestamp ?? Date.now() / 1000,
                      latest: {
                        ...s.latest,
                        [msg.metric!]: {
                          value: msg.value!,
                          timestamp: msg.timestamp ?? Date.now() / 1000,
                        },
                      },
                    }
                  : s
              )
            );

            // Append to live chart data if it's the selected sensor
            if (msg.sensor === selectedSensor && msg.timestamp) {
              if (msg.metric === "temperature") {
                setLiveTimestamps((prev) => [...prev.slice(-3600), msg.timestamp!]);
                setLiveTemps((prev) => [...prev.slice(-3600), msg.value!]);
              }
              if (msg.metric === "humidity") {
                setLiveHums((prev) => [...prev.slice(-3600), msg.value!]);
              }
            }
          }

          if (msg.type === "status" && msg.sensor) {
            setSensors((prev) =>
              prev.map((s) =>
                s.name === msg.sensor
                  ? { ...s, online: msg.status === "online", mqtt_status: msg.status }
                  : s
              )
            );
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      reconnectRef.current = setTimeout(connectWs, 3000);
    }
  }, [selectedSensor]);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connectWs]);

  // Ping keepalive
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Derive chart data ──
  const chartTimestamps: number[] = [];
  const chartTemps: number[] = [];
  const chartHums: number[] = [];

  if (timeRange === "24h" && history?.data) {
    const tempData = history.data.temperature;
    const humData = history.data.humidity;
    if (tempData?.timestamps && tempData?.values) {
      chartTimestamps.push(...tempData.timestamps);
      chartTemps.push(...tempData.values);
    }
    if (humData?.values) {
      chartHums.push(...humData.values);
    }
    // Append live data
    for (let i = 0; i < liveTimestamps.length; i++) {
      if (chartTimestamps.length === 0 || liveTimestamps[i] > chartTimestamps[chartTimestamps.length - 1]) {
        chartTimestamps.push(liveTimestamps[i]);
        chartTemps.push(liveTemps[i] ?? 0);
        chartHums.push(liveHums[i] ?? 0);
      }
    }
  } else if (history?.data) {
    const tempData = history.data.temperature;
    const humData = history.data.humidity;
    if (tempData?.hours && tempData?.avg) {
      for (let i = 0; i < tempData.hours.length; i++) {
        chartTimestamps.push(new Date(tempData.hours[i]).getTime() / 1000);
        chartTemps.push(tempData.avg[i]);
      }
    }
    if (humData?.avg) {
      chartHums.push(...humData.avg);
    }
  }

  // Pad humidity array to match timestamps
  while (chartHums.length < chartTimestamps.length) chartHums.push(0);

  const selectedSensorObj = sensors.find((s) => s.name === selectedSensor);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* ── Header ── */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              <span className="text-emerald-400">🌡️</span> Lab Monitor
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Environmental sensors — temperature, humidity, and more
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* MQTT status */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {mqttConnected ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">MQTT connected</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-500">MQTT disconnected</span>
                </>
              )}
            </div>
            {/* WS status */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {wsConnected ? (
                <>
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400">Live</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-zinc-600">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {backendError && (
        <div className="mx-6 mt-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg px-4 py-2 text-sm">
          Cannot reach backend (port 8006). Is the server running?
        </div>
      )}

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* ── Sidebar: Sensor List ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                Sensors
              </h2>
              <span className="text-[10px] text-zinc-600 font-mono">
                {sensors.filter((s) => s.online).length}/{sensors.length} online
              </span>
            </div>

            {sensors.length === 0 && !backendError && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
                <Thermometer className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 mb-1">No sensors detected</p>
                <p className="text-[10px] text-zinc-600">
                  Sensors auto-register when they publish to MQTT
                </p>
              </div>
            )}

            {sensors.map((sensor) => (
              <SensorCard
                key={sensor.name}
                sensor={sensor}
                isSelected={selectedSensor === sensor.name}
                onClick={() => {
                  setSelectedSensor(sensor.name);
                  setLiveTimestamps([]);
                  setLiveTemps([]);
                  setLiveHums([]);
                }}
              />
            ))}
          </div>

          {/* ── Main: Chart + Info ── */}
          <div className="space-y-4">
            {/* Time range buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {(["24h", "7d", "30d"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${timeRange === r
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {loadingHistory && (
                <RefreshCw className="w-3.5 h-3.5 text-zinc-600 animate-spin" />
              )}
            </div>

            {/* Chart */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 min-h-[400px]">
              <TemperatureChart
                timestamps={chartTimestamps}
                temperatures={chartTemps}
                humidities={chartHums}
                title={selectedSensorObj?.name ?? "Select a sensor"}
                range={timeRange}
              />
            </div>

            {/* Sensor info panel */}
            {selectedSensorObj && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                  Sensor Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Name</span>
                    <span className="text-zinc-200 font-mono">{selectedSensorObj.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Status</span>
                    <span className={selectedSensorObj.online ? "text-emerald-400" : "text-red-400"}>
                      {selectedSensorObj.online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">First Seen</span>
                    <span className="text-zinc-200 font-mono">
                      {new Date(selectedSensorObj.first_seen * 1000).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">WiFi Signal</span>
                    <span className="text-zinc-200 font-mono">
                      {selectedSensorObj.latest?.rssi
                        ? `${selectedSensorObj.latest.rssi.value.toFixed(0)} dBm`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
