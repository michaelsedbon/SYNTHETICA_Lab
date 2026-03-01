# ADC-24 Electrophysiology Dashboard

**Slug:** `adc24-dashboard`  
**Status:** ✅ Working  
**Experiment:** EXP_001  
**Ports:** 8000 (API) · 3001 (UI)

---

## Purpose

Real-time web dashboard for recording, visualising, and exporting electrical signals from **fungal mycelia** using the **Pico Log ADC-24** data acquisition unit. Reproduces the methodology from Mishra et al., *Sci. Robot.* 2024.

Supports a **demo mode** for development without hardware — generates synthetic fungal-like spike trains for UI testing.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI · WebSockets |
| Frontend | Next.js · shadcn/ui · Canvas API |
| Hardware | Pico Log ADC-24 via Rosetta bridge (x86_64 → ARM64) |

---

## How to Run

```bash
# Backend (port 8000)
cd applications/adc24-dashboard/server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend (port 3001)
cd applications/adc24-dashboard/dashboard
npm run dev -- -p 3001
```

Open **http://localhost:3001**

---

## API Endpoints

### REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Get device connection status and recording state |
| POST | `/api/connect` | Connect to the ADC-24 hardware |
| POST | `/api/disconnect` | Disconnect from the ADC-24 |
| POST | `/api/start` | Start recording (params: channel, voltage_range, differential, mains_50hz) |
| POST | `/api/stop` | Stop recording and finalize CSV session |
| GET | `/api/sessions` | List saved recording sessions (CSV files) |
| GET | `/api/sessions/{session_id}` | Download a session CSV file |
| POST | `/api/demo/start` | Start demo mode with synthetic fungal signals (no hardware) |

### WebSocket

| Path | Description |
|------|-------------|
| `ws://localhost:8000/ws` | Real-time data streaming — broadcasts latest voltage samples and peak detections to all connected clients |

---

## Architecture

```
server/
  main.py              — FastAPI app, REST + WebSocket endpoints
  adc24_driver.py      — Hardware driver (subprocess bridge to PicoSDK)
  picohrdl_bridge.py   — x86_64 Rosetta bridge for libpicohrdl.dylib
  signal_processing.py — Savitzky-Golay filter, peak detection

dashboard/
  src/app/page.tsx            — Main layout, state management, WS data flow
  src/components/
    live-chart.tsx    — Canvas real-time voltage trace (step rendering)
    controls.tsx      — Device config, start/stop buttons
    stats-panel.tsx   — Live stats (samples, peaks, spike rate)
    session-list.tsx  — Past recordings with CSV download
```

---

## Signal Processing Config

| Parameter | Value | Source |
|-----------|-------|--------|
| Mode | Differential (E1/E2, EGND) | Paper §2.2 |
| Range | ±39 mV | Paper §2.2 |
| Sampling | 10 S/s (100 ms conv.) | Paper §2.2 |
| Mains rejection | 50 Hz | Paper §2.2 |
| Filter | Savitzky-Golay (k=3, n=11) | Paper §2.3 |
| Peak detection | Prominence ≥ 10 µV | Paper §2.3 |

---

## Data Output

CSV files saved to `experiments/EXP_001/data/session_*.csv` with columns:

| Column | Description |
|--------|-------------|
| `timestamp` | Unix timestamp |
| `channel` | ADC channel number |
| `raw_adc` | Raw ADC reading |
| `voltage_uv` | Voltage in microvolts |

---

## Key Features

- **Real-time Canvas chart** with voltage trace rendering
- **WebSocket streaming** at ~10 S/s
- **Demo mode** — synthetic fungal spike trains for UI development
- **Session management** — start/stop recordings, browse history, download CSV
- **Live statistics** — sample count, peak count, spike rate
- **Hardware abstraction** — Rosetta bridge for Apple Silicon compatibility
