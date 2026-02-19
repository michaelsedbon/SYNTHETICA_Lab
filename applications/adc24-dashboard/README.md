# ADC-24 Electrophysiology Dashboard

Real-time web dashboard for recording, visualising, and exporting electrical signals from fungal mycelia using the **Pico Log ADC-24**, reproducing the methodology from Mishra et al., Sci. Robot. 2024.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · FastAPI · WebSockets |
| Frontend | Next.js · shadcn/ui · Canvas API |
| Hardware | Pico Log ADC-24 via Rosetta bridge (x86_64 → ARM64) |

## How to Run

```bash
# Backend (port 8000)
cd server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend (port 3001)
cd dashboard
npm run dev -- -p 3001
```

Open **http://localhost:3001** in your browser.

> **Demo mode** works without hardware — click « ▶ Demo Mode (no hardware) ».
> For real recording, connect ADC-24 via USB then click **Connect ADC-24** → **Start Recording**.

## Key Config

| Parameter | Value | Source |
|-----------|-------|--------|
| Mode | Differential (E1/E2, EGND) | Paper §2.2 |
| Range | ±39 mV | Paper §2.2 |
| Sampling | 10 S/s (100 ms conv.) | Paper §2.2 |
| Mains rejection | 50 Hz | Paper §2.2 |
| Filter | Savitzky-Golay (k=3, n=11) | Paper §2.3 |
| Peak detection | Prominence ≥ 10 µV | Paper §2.3 |

## Architecture

```
server/
  main.py              — FastAPI app, REST + WebSocket endpoints
  adc24_driver.py      — Hardware driver (subprocess bridge to PicoSDK)
  picohrdl_bridge.py   — x86_64 Rosetta bridge for libpicohrdl.dylib
  signal_processing.py — Savitzky-Golay filter, peak detection

dashboard/
  src/app/page.tsx            — Main layout, state management, WS data flow
  src/components/live-chart   — Canvas real-time voltage trace (step rendering)
  src/components/controls     — Device config, start/stop buttons
  src/components/stats-panel  — Live stats (samples, peaks, spike rate)
  src/components/session-list — Past recordings with CSV download
```

## Data Output

CSV files are saved to `experiments/EXP_001/data/session_*.csv` with columns: `timestamp`, `channel`, `raw_adc`, `voltage_uv`.
