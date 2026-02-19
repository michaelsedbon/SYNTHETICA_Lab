const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SessionInfo {
    id: string;
    filename: string;
    size_bytes: number;
    created_at: string;
}

export interface StatusResponse {
    connected: boolean;
    recording: boolean;
    session_id: string | null;
    sample_count: number;
    peak_count: number;
    elapsed_s: number;
}

export interface StartResponse {
    status: string;
    session_id: string;
    csv_path?: string;
    note?: string;
}

export interface StopResponse {
    status: string;
    session_id: string;
    duration_s: number;
    sample_count: number;
    peak_count: number;
    csv_path: string;
}

export interface StreamMessage {
    type: string;
    times: number[];
    raw_uv: number[];
    filtered_uv: number[];
    peaks: Array<{
        time: number;
        height_uv: number;
        width_s: number;
        polarity: string;
    }>;
    stats: {
        sample_count: number;
        peak_count: number;
        elapsed_s: number;
        spike_freq_hz: number;
        latest_uv: number;
    };
}

export async function getStatus(): Promise<StatusResponse> {
    const res = await fetch(`${API_BASE}/api/status`);
    return res.json();
}

export async function connectDevice(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/api/connect`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json();
}

export async function disconnectDevice(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/api/disconnect`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json();
}

export async function startRecording(params?: {
    channel?: number;
    voltage_range?: string;
    differential?: boolean;
    mains_50hz?: boolean;
}): Promise<StartResponse> {
    const query = new URLSearchParams();
    if (params?.channel) query.set("channel", String(params.channel));
    if (params?.voltage_range) query.set("voltage_range", params.voltage_range);
    if (params?.differential !== undefined) query.set("differential", String(params.differential));
    if (params?.mains_50hz !== undefined) query.set("mains_50hz", String(params.mains_50hz));

    const res = await fetch(`${API_BASE}/api/start?${query}`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json();
}

export async function startDemo(): Promise<StartResponse> {
    const res = await fetch(`${API_BASE}/api/demo/start`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json();
}

export async function stopRecording(): Promise<StopResponse> {
    const res = await fetch(`${API_BASE}/api/stop`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json();
}

export async function listSessions(): Promise<{ sessions: SessionInfo[] }> {
    const res = await fetch(`${API_BASE}/api/sessions`);
    return res.json();
}

export function getSessionDownloadUrl(sessionId: string): string {
    return `${API_BASE}/api/sessions/${sessionId}/download`;
}

export function createWebSocket(): WebSocket {
    const wsBase = API_BASE.replace(/^http/, "ws");
    return new WebSocket(`${wsBase}/ws/stream`);
}
