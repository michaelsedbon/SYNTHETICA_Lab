# EXP_001 — Documentation Index

Comprehensive index of all files in this experiment.

---

## Documentation

| File | Description |
|------|-------------|
| `summary.md` | Experiment overview, inoculation details, ADC-24 system characterisation, long-term recording analysis |
| `LOG.md` | Chronological experiment log |
| `SCRIPT_INDEX.md` | Script and file index |
| `DOC_INDEX.md` | This file |

## Data Files — Root

| File | Size | Date | Description |
|------|------|------|-------------|
| `session_20260219_184841.csv` | 180 KB | 2026-02-19 | Short session recording (custom web app) |
| `session_20260219_184841 (1).csv` | 227 KB | 2026-02-19 | Session recording, copy 1 |
| `session_20260219_184841 (2).csv` | 12.8 MB | 2026-02-20 | Session recording, copy 2 |
| `session_20260219_184841(2)test.csv` | 330 MB | **2026-03-09** | Long-term recording (~430 hours) — **freshly downloaded** |
| `session_20260219_184841(4).csv` | 82 MB | 2026-02-24 | Extended session recording |

## Data Files — `data/`

| File | Size | Date | Description |
|------|------|------|-------------|
| `data/faraday cage.hdf5` | 12.5 KB | 2026-02-19 | Baseline recording (PicoLog) inside Faraday cage, no biology |
| `data/faaraday.csv` | 36 KB | 2026-02-19 | Baseline recording (custom web app) inside Faraday cage, no biology |
| `data/session_20260219_154112.csv` | 126 KB | 2026-02-19 | Longer session recording (custom web app) |
| `data/2.hdf5` | 9.8 KB | 2026-02-19 | Earlier PicoLog test recording |
| `data/Untitled.hdf5` | 8.5 KB | 2026-02-19 | Earlier PicoLog test recording |

## Scripts

| File | Description |
|------|-------------|
| `generate_trace.py` | Generates clean trace PNGs with multi-pass spike rejection |

## Notebooks

| File | Description |
|------|-------------|
| `analyze_session.ipynb` | Interactive session analysis (plotly/matplotlib, windowed views) |
| `data/plot_recording.ipynb` | Analysis of PicoLog HDF5 recording |
| `data/plot_csv_recording.ipynb` | Analysis of custom web app CSV recording |

## Generated Figures

| File | Description |
|------|-------------|
| `trace.png` | Raw voltage trace |
| `trace_clean.png` | Full recording, spike-filtered |
| `trace_signal_onset.png` | Signal onset zoom (hours 320–430) |
| `data/comparison_traces.png` | Raw voltage trace comparison (PicoLog vs custom app) |
| `data/comparison_histograms.png` | Amplitude distribution histograms |

## Other

| File | Description |
|------|-------------|
| `PicoSDK-11.1.0.418.pkg` | PicoLog SDK installer (macOS) |
