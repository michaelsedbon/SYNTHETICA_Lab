# ESP8266 Level Motor API

| Field | Value |
|-------|-------|
| **Base URL** | `http://172.16.1.115` |
| **Device** | ESP8266 (hostname: `cryptobeings`) |
| **Source** | [`experiments/EXP_005/firmware/esp8266_ota/src/main.cpp`](../../experiments/EXP_005/firmware/esp8266_ota/src/main.cpp) |
| **GitHub** | [esp8266_ota](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_005/firmware/esp8266_ota/) |

## Overview

HTTP REST API running directly on the ESP8266. All endpoints proxy commands to the Arduino Nano via serial. Responses include CORS headers (`Access-Control-Allow-Origin: *`).

> **Note:** The Machine Controller on the LattePanda also proxies to this device. For unified access, prefer the Machine Controller API. Use this API for direct/standalone operation.

## Endpoints

### `GET /`
Web dashboard with motor controls, status display, speed/accel sliders, manual command input, and log viewer.

### `GET /api/ping`
```json
{"ok": true, "response": "PONG"}
```
If Nano is unresponsive: `{"ok": false, "error": "TIMEOUT"}`

### `GET /api/status`
Parsed motor status from Nano.
```json
{"pos": 1200, "hall": 0, "speed": 2000, "moving": 0, "spr": 3200, "calibrated": 1}
```

### `GET /api/send?cmd=MOVE%20500&timeout=5000`
Send arbitrary command. Optional `timeout` param (default 5000ms).
```json
{"ok": true, "cmd": "MOVE 500", "response": "OK MOVE 500 POS:1200 TGT:1700"}
```

### `GET /api/move?steps=1000`
```json
{"ok": true, "steps": 1000}
```

### `GET /api/home`
Blocks until `HOMED` received (up to 60s).
```json
{"ok": true}
```

### `GET /api/stop`
```json
{"ok": true}
```

### `GET /api/calibrate`
Full revolution calibration. Blocks up to 120s.
```json
{"ok": true, "spr": 3200}
```

### `GET /api/half`
Move to half revolution.
```json
{"ok": true}
```

### `GET /api/speed?value=3000`
```json
{"ok": true, "speed": 3000}
```

### `GET /api/accel?value=2000`
```json
{"ok": true, "accel": 2000}
```

### `GET /api/log`
Returns last 40 log entries (newest first).
```json
["142s TX> STATUS", "142s RX< POS:1200", ...]
```

### `GET /reset-nano`
Resets the Arduino Nano by toggling GPIO14 (D5) LOW for 100ms.
```json
{"ok": true, "msg": "Nano reset"}
```

## TCP Bridge (Port 2323)

A raw TCP socket bridge on port 2323 directly connects to the Nano's serial port. Used by `flash_nano.py` for remote firmware updates.

```bash
# Connect manually
nc 172.16.1.115 2323
PING
# → PONG
```
