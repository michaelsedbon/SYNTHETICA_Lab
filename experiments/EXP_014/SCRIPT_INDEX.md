# EXP_014 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Firmware

| File | Description |
|------|-------------|
| `firmware/motor_nano/src/main.cpp` | Arduino Nano motor controller firmware (AccelStepper + serial commands). Updated version with IDENTIFY, HOME, ZERO, SENSOR commands (pending flash). |
| `firmware/motor_nano/platformio.ini` | PlatformIO build config for Nano ATmega328 (new bootloader). Upload port: `/dev/ttyUSB1` |

## Server (FastAPI Backend)

| File | Description |
|------|-------------|
| `server/main.py` | FastAPI application: serial DeviceManager, REST API, WebSocket status poller |
| `server/static/index.html` | Web dashboard HTML (motor card template, topbar, log panel) |
| `server/static/style.css` | Dashboard CSS (Skill Manager-style dark theme, motor cards, sliders) |
| `server/static/app.js` | Dashboard JavaScript (WebSocket client, API helpers, motor card rendering) |

## Deployment

| Location | Path | Description |
|----------|------|-------------|
| LattePanda | `~/machine-controller-app/` | Server + static files (deployed via SCP) |
| LattePanda | `~/firmware/motor_nano/` | PlatformIO firmware project |
| LattePanda | `~/machine-controller/` | Python 3.12 venv (FastAPI, pyserial, uvicorn, etc.) |
| Mac | `~/.ssh/config` (Host lp) | SSH alias for `michael@172.16.1.128` |
