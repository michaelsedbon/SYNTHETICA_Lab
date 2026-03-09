# EXP_001 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Data Files

| File | Description |
|------|-------------|
| `data/faraday cage.hdf5` | Baseline recording (PicoLog) inside Faraday cage, no biology |
| `data/faaraday.csv` | Baseline recording (custom web app) inside Faraday cage, no biology |
| `data/session_20260219_154112.csv` | Longer session recording (custom web app) |
| `data/2.hdf5` | Earlier PicoLog test recording |
| `data/Untitled.hdf5` | Earlier PicoLog test recording |
| `data/comparison_traces.png` | Raw voltage trace comparison plot |
| `data/comparison_histograms.png` | Amplitude distribution histograms |
| `session_20260219_184841(2)test.csv` | Long-term recording (~430 hours, 330 MB) |
| `trace_clean.png` | Full recording, spike-filtered |
| `trace_signal_onset.png` | Signal onset zoom (hours 320–430) |

## Scripts

| File | Description |
|------|-------------|
| `generate_trace.py` | Generates clean trace PNGs with multi-pass spike rejection |

## Notebooks

| File | Description |
|------|-------------|
| `data/plot_recording.ipynb` | Analysis of PicoLog HDF5 recording |
| `data/plot_csv_recording.ipynb` | Analysis of custom web app CSV recording |
| `analyze_session.ipynb` | Interactive session analysis notebook (plotly/matplotlib, windowed views) |
