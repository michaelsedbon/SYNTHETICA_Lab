# ADC-24 Electrophysiology Dashboard

**Created:** 2024  
**Stack:** Python FastAPI · Next.js · WebSockets · Canvas API  
**Ports:** 8000 (API) · 3001 (UI)  
**Linked Experiment:** EXP_001  

---

## Overview

Real-time web dashboard for recording, visualising, and exporting electrical signals from **fungal mycelia** using the **Pico Log ADC-24** data acquisition unit. Reproduces the methodology from Mishra et al., *Sci. Robot.* 2024.

The system connects to a Pico Log ADC-24 via a Rosetta bridge (x86_64 → ARM64 for Apple Silicon), streams voltage data over WebSockets at ~10 samples/second, renders a live Canvas chart, and saves session data as CSV files to the experiment folder.

A **demo mode** generates synthetic fungal-like spike trains for UI development without hardware.

---

## Architecture

| Component | Description |
|-----------|-------------|
| `server/main.py` | FastAPI app — REST endpoints + WebSocket streaming |
| `server/adc24_driver.py` | Hardware driver via subprocess bridge to PicoSDK |
| `server/picohrdl_bridge.py` | x86_64 Rosetta bridge for `libpicohrdl.dylib` |
| `server/signal_processing.py` | Savitzky-Golay filter + peak detection |
| `dashboard/src/app/page.tsx` | Main layout, state management, WS data flow |
| `dashboard/src/components/live-chart.tsx` | Canvas real-time voltage trace |
| `dashboard/src/components/controls.tsx` | Device config, start/stop buttons |
| `dashboard/src/components/stats-panel.tsx` | Live stats (samples, peaks, spike rate) |
| `dashboard/src/components/session-list.tsx` | Past recordings with CSV download |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Device and recording status |
| POST | `/api/connect` | Connect to ADC-24 |
| POST | `/api/disconnect` | Disconnect from ADC-24 |
| POST | `/api/start` | Start recording |
| POST | `/api/stop` | Stop recording, finalize CSV |
| GET | `/api/sessions` | List saved sessions |
| GET | `/api/sessions/{id}` | Download session CSV |
| POST | `/api/demo/start` | Start demo mode (synthetic signals) |
| WS | `/ws` | Real-time voltage stream |

---

## Signal Processing

| Parameter | Value |
|-----------|-------|
| Mode | Differential (E1/E2, EGND) |
| Range | ±39 mV |
| Sampling | 10 S/s (100 ms conv.) |
| Mains rejection | 50 Hz |
| Filter | Savitzky-Golay (k=3, n=11) |
| Peak detection | Prominence ≥ 10 µV |

---

## Data Output

CSV files → `experiments/EXP_001/data/session_*.csv`  
Columns: `timestamp`, `channel`, `raw_adc`, `voltage_uv`

See [DOCS.md](DOCS.md) for complete details.
