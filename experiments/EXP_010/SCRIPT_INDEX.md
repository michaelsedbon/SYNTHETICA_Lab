# EXP_010 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Backend Modules (ADC-24 Dashboard Server)

| File | Description |
|------|-------------|
| `applications/adc24-dashboard/server/led_client.py` | Async HTTP client for LED-DRV8 REST API |
| `applications/adc24-dashboard/server/stimulus_scheduler.py` | Background stimulus scheduler — builds timeline, executes events, annotates CSV |
| `applications/adc24-dashboard/server/main.py` | Extended with 4 protocol endpoints and stimulus-annotated CSV |

## Frontend Components (ADC-24 Dashboard)

| File | Description |
|------|-------------|
| `applications/adc24-dashboard/dashboard/src/components/protocol-controls.tsx` | Protocol load/start/stop controls with progress bar |
| `applications/adc24-dashboard/dashboard/src/lib/api.ts` | Protocol API functions (loadProtocol, startProtocol, etc.) |

## Experiment Designer App

| File | Description |
|------|-------------|
| `applications/experiment-designer/dashboard/src/app/page.tsx` | Protocol builder UI with block/stimulus editors, timeline preview |
| `applications/experiment-designer/dashboard/src/lib/protocol.ts` | Protocol types, factory functions, utility functions |
| `applications/experiment-designer/server/main.py` | FastAPI backend — protocol CRUD + validation |

## Data Analysis Scripts

| File | Description |
|------|-------------|
| `experiments/EXP_010/analysis/01_load_and_explore.py` | Load CSV, basic stats, full-session voltage trace with stimulus bands |
| `experiments/EXP_010/analysis/02_stimulus_response.py` | Epoch analysis around stimuli, mean response curves, paired t-tests |
| `experiments/EXP_010/analysis/03_summary_figures.py` | 4-panel publication figure: trace, mean response, RMS box plot, PSD |
