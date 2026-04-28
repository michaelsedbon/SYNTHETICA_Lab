# EXP_020 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Firmware

Firmware lives in **EXP_004** and is reused as-is (no reflash needed):

| File | Purpose |
|------|---------|
| [`../EXP_004/firmware/src/main.cpp`](../EXP_004/firmware/src/main.cpp) | Arduino Mega 2560 — JSON-over-serial 4×4 cross-scan @ 115200 baud |
| [`../EXP_004/firmware/platformio.ini`](../EXP_004/firmware/platformio.ini) | PlatformIO build config |

## Webapp

| File | Purpose |
|------|---------|
| [`webapp/index.html`](webapp/index.html) | Single-file HTML app — cable dropdown, live scan, save results |
| [`webapp/server.py`](webapp/server.py) | Static HTTP server (port 8043) + `/api/save` for results |
| [`webapp/results/cable_continuity.json`](webapp/results/) | Live per-cable scan records (server append) |

## Results (snapshots)

| File | Purpose |
|------|---------|
| [`results/cable_continuity_2026-04-27.json`](results/cable_continuity_2026-04-27.json) | Final 16-cable scan — full records with calibration |
| [`results/cable_continuity_2026-04-27.csv`](results/cable_continuity_2026-04-27.csv) | Same data as flat CSV |
