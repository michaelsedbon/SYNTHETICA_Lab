/**
 * Lab Monitor — API Client
 * =========================
 * REST + WebSocket helpers for the FastAPI backend.
 *
 * Backend runs on port 8006.
 */

// ── Types ──

export interface SensorReading {
  value: number;
  timestamp: number;
}

export interface Sensor {
  name: string;
  first_seen: number;
  last_seen: number;
  location: string;
  notes: string;
  online: boolean;
  mqtt_status?: string;
  latest: Record<string, SensorReading>;
}

export interface SensorsResponse {
  sensors: Sensor[];
}

export interface HistoryData {
  timestamps?: number[];
  values?: number[];
  hours?: string[];
  avg?: number[];
  min?: number[];
  max?: number[];
}

export interface HistoryResponse {
  sensor: string;
  type: "raw" | "hourly";
  range: string;
  data: Record<string, HistoryData>;
}

export interface StatusResponse {
  ok: boolean;
  mqtt_connected: boolean;
  mqtt_broker: string;
  sensor_count: number;
  ws_clients: number;
  uptime_s: number;
}

export interface WsMessage {
  type: "init" | "reading" | "status" | "pong";
  sensor?: string;
  metric?: string;
  value?: number;
  timestamp?: number;
  status?: string;
  sensors?: Record<string, Record<string, SensorReading>>;
  mqtt_connected?: boolean;
}

// ── API Base URL ──

function getApiBase(): string {
  if (typeof window === "undefined") return "http://localhost:8006";
  return `http://${window.location.hostname}:8006`;
}

// ── REST Helpers ──

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch(`${getApiBase()}/api/status`);
  if (!res.ok) throw new Error(`Status request failed: ${res.status}`);
  return res.json();
}

export async function fetchSensors(): Promise<SensorsResponse> {
  const res = await fetch(`${getApiBase()}/api/sensors`);
  if (!res.ok) throw new Error(`Sensors request failed: ${res.status}`);
  return res.json();
}

export async function fetchHistory(
  sensorName: string,
  range: "24h" | "7d" | "30d" = "24h"
): Promise<HistoryResponse> {
  const res = await fetch(
    `${getApiBase()}/api/sensors/${encodeURIComponent(sensorName)}/history?range=${range}`
  );
  if (!res.ok) throw new Error(`History request failed: ${res.status}`);
  return res.json();
}

// ── WebSocket ──

export function createWebSocket(): WebSocket {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return new WebSocket(`ws://${host}:8006/ws`);
}
