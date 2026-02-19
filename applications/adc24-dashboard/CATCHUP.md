# ADC-24 Dashboard — Catchup

## 2026-02-19 — Initial build
- Built full-stack app: FastAPI backend + Next.js/shadcn frontend
- Implemented ADC-24 driver matching Mishra et al. paper parameters
- Signal processing pipeline: Savitzky-Golay filter, peak detection, noise gating
- WebSocket real-time streaming with canvas-based chart (step rendering, no interpolation)
- Demo mode for testing without hardware
- CSV export of recording sessions

## 2026-02-19 — Rosetta bridge architecture
- Discovered PicoSDK C library (`libpicohrdl.dylib`) is x86_64 only on macOS
- Rewrote driver to use subprocess bridge: `picohrdl_bridge.py` runs under Rosetta, main server stays native ARM64
- Bridge communicates via JSON over stdin/stdout pipes
- Successfully connected to real ADC-24 hardware and streamed data

## 2026-02-19 — Moved to applications dir
- Relocated from `experiments/EXP_001/app/` to `applications/adc24-dashboard/`
- Updated experiment summary.md path reference
- Added README.md and this CATCHUP.md
