# EXP_022 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Firmware

| File | Purpose |
|------|---------|
| [`firmware/lights_uno/src/main.cpp`](firmware/lights_uno/src/main.cpp) | Arduino Uno firmware — 5-channel relay controller, ASCII serial protocol @ 115200 |
| [`firmware/lights_uno/platformio.ini`](firmware/lights_uno/platformio.ini) | PlatformIO build config (board: `uno`, framework: arduino) |

## Modified files in other experiments / project knowledge

| File | Change |
|------|--------|
| [`../EXP_014/server/devices.yaml`](../EXP_014/server/devices.yaml) | New `relay_devices` entry for `LIGHTS_1` |
| [`../EXP_014/server/main.py`](../EXP_014/server/main.py) | New `USBRelayConnection` class + `/api/relays/...` endpoints |
| [`../EXP_014/server/static/index.html`](../EXP_014/server/static/index.html) | Relay card template + dynamic rendering |
| [`../EXP_014/server/static/app.js`](../EXP_014/server/static/app.js) | Relay rendering + WebSocket handlers |
| [`../EXP_014/server/static/style.css`](../EXP_014/server/static/style.css) | Relay card styling |

## System config (LattePanda)

| File | Change |
|------|--------|
| `/etc/udev/rules.d/99-machine-controller.rules` | Appended LIGHTS_1 rule matching Uno R3 serial → `/dev/lights_1` |
