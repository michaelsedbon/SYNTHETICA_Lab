# Machine Controller API

| Field | Value |
|-------|-------|
| **Base URL** | `http://172.16.1.128:8000` |
| **Framework** | FastAPI (Python) |
| **Source** | [`experiments/EXP_014/server/main.py`](../../experiments/EXP_014/server/main.py) |
| **GitHub** | [server](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_014/server/) |
| **Device registry** | [`experiments/EXP_014/server/devices.yaml`](../../experiments/EXP_014/server/devices.yaml) |

## Overview

Central control server running on the LattePanda Alpha. Manages all motors (USB serial + ESP HTTP) through a unified REST API and WebSocket interface. The web dashboard at `/` provides a tabbed UI for motors, cameras, and relays.

## Endpoints

### System

#### `GET /api/devices`
Returns all registered motors.
```json
{"motors": [{"id": "MOTOR_1", "type": "dm556_stepper", "connected": true}, ...]}
```

#### `GET /api/system/health`
```json
{"status": "ok", "motors": [...], "uptime": 1741804800.0}
```

#### `GET /api/system/config`
Returns full `devices.yaml` config including experiment refs and firmware paths.

#### `POST /api/system/scan`
Re-scan and reconnect all devices.
```json
{"ok": true, "motors": [...]}
```

#### `POST /api/stop-all`
Emergency stop all motors.
```json
{"ok": true, "results": {"MOTOR_1": "OK STOPPED", "LEVEL_1": "OK STOPPED"}}
```

---

### Motor Control

All motor endpoints use `{motor_id}` — valid values: `MOTOR_1`, `LEVEL_1`

#### `GET /api/motors/{motor_id}/status`
```json
{"id": "MOTOR_1", "type": "dm556_stepper", "pos": 1500, "speed": 2000, "moving": 0, "target": 1500, "sensor": 0}
```

#### `GET /api/motors/{motor_id}/sensor`
Read proximity/hall sensor state only.
```json
{"id": "MOTOR_1", "sensor": 0, "raw": "POS:1500 SPEED:2000 MOVING:0 TARGET:1500 SENSOR:0"}
```

#### `GET /api/motors/{motor_id}/level`
Get position as 0–100% of `max_steps`.
```json
{"id": "MOTOR_1", "pos": 1500, "percent": 37.5, "max_steps": 4000}
```

#### `POST /api/motors/{motor_id}/level?percent=50.0`
Move to a percentage position.
```json
{"ok": true, "percent": 50.0, "target_steps": 2000, "response": "OK MOVETO 2000"}
```

#### `POST /api/motors/{motor_id}/move?steps=1000`
Relative move.
```json
{"ok": true, "response": "OK MOVE 1000"}
```

#### `POST /api/motors/{motor_id}/moveto?position=3000`
Absolute move.
```json
{"ok": true, "response": "OK MOVETO 3000"}
```

#### `POST /api/motors/{motor_id}/home`
Home to sensor position.
```json
{"ok": true, "response": "OK HOMING"}
```

#### `POST /api/motors/{motor_id}/stop`
Emergency stop.
```json
{"ok": true, "response": "OK STOPPED"}
```

#### `POST /api/motors/{motor_id}/zero`
Zero current position.
```json
{"ok": true, "response": "OK ZEROED"}
```

#### `PUT /api/motors/{motor_id}/config?speed=3000&accel=2000`
Set speed and/or acceleration.
```json
{"ok": true, "responses": ["OK SPEED 3000", "OK ACCEL 2000"]}
```

#### `PUT /api/motors/{motor_id}/max_steps?value=4000`
Set max steps for level percentage calculation. Persists to `devices.yaml`.
```json
{"ok": true, "max_steps": 4000}
```

#### `POST /api/motors/{motor_id}/raw?command=STATUS`
Send arbitrary serial command.
```json
{"ok": true, "response": "POS:1500 SPEED:2000 MOVING:0 TARGET:1500 SENSOR:0"}
```

#### `POST /api/motors/{motor_id}/calibrate`
ESP motors only (LEVEL_1). Runs full-revolution hall sensor calibration.
```json
{"ok": true, "response": "CAL_DONE SPR:3200"}
```

#### `POST /api/motors/{motor_id}/half`
ESP motors only. Move to half revolution.
```json
{"ok": true, "response": "OK HALF 1600"}
```

---

### WebSocket

#### `WS /ws`
Real-time bidirectional communication.

**Client → Server:**
```json
{"type": "command", "motor_id": "MOTOR_1", "command": "STATUS"}
```

**Server → Client:**
```json
{"type": "response", "motor": "MOTOR_1", "response": "POS:1500 ..."}
```

**Server broadcasts** on motor events:
```json
{"type": "command", "motor": "MOTOR_1", "cmd": "MOVE 1000", "resp": "OK MOVE 1000"}
{"type": "config", "motor": "MOTOR_1", "max_steps": 4000}
```
