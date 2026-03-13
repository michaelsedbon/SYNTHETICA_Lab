# Knowledge Base Guide — Cryptographic Beings

> **Purpose:** This document defines the structure, templates, and rules for maintaining the project knowledge base. Any agent modifying hardware, firmware, APIs, or software in this project **must** update the relevant knowledge base files.

## File Structure

```
knowledge/
  GUIDE.md                     ← This file
  structure.md                 ← System architecture, network topology
  hardware.md                  ← All devices, wiring, PCBs
  software.md                  ← Dashboard, deployment, systemd
  firmware/
    motor_nano_dm556.md        ← MOTOR_1 slewing bearing motor
    level_nano_dm542.md        ← LEVEL_1 level motor (Nano side)
    level_esp8266.md           ← LEVEL_1 WiFi bridge (ESP8266 side)
    esp32_cam.md               ← CAM_1 camera
  api/
    machine_controller.md      ← FastAPI server (LattePanda)
    esp8266_level_motor.md     ← ESP8266 HTTP REST API
    esp32_cam.md               ← Camera HTTP endpoints
```

## When to Update

Update the knowledge base when you:
- Add, remove, or modify a **physical device** → `hardware.md`
- Write or change **firmware** → `firmware/<device>.md`
- Add or change **API endpoints** → `api/<service>.md`
- Change **network config, IPs, or deployment** → `structure.md` or `software.md`
- Add a new knowledge base file → update `nav.yaml`

## Templates

### New Firmware Doc

```markdown
# [Device Name] Firmware

| Field | Value |
|-------|-------|
| **Device ID** | `XXX` |
| **MCU** | Arduino Nano / ESP8266 / ESP32 |
| **Driver** | DM556 / ISD04 / — |
| **Source** | `experiments/EXP_XXX/firmware/xxx/` |
| **GitHub** | [link](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_XXX/firmware/xxx/) |

## Wiring
| Nano Pin | Function | Connected To |
|----------|----------|-------------|
| D4 | STEP | DM556 PUL+ |

## Serial Protocol (115200 baud)
| Command | Response | Description |
|---------|----------|-------------|
| `PING` | `PONG` | Health check |

## Build & Flash
\`\`\`bash
cd experiments/EXP_XXX/firmware/xxx
pio run --target upload
\`\`\`

## Changelog
| Date | Change | Experiment |
|------|--------|-----------|
| 2026-03-XX | Initial version | EXP_XXX |
```

### New API Doc

```markdown
# [Service Name] API

| Field | Value |
|-------|-------|
| **Base URL** | `http://172.16.1.XXX:XXXX` |
| **Source** | `experiments/EXP_XXX/server/main.py` |
| **GitHub** | [link](...) |

## Endpoints

### `GET /api/xxx`
**Description:** ...
**Parameters:** `param` (type) — description
**Response:**
\`\`\`json
{"ok": true}
\`\`\`
```

### New Hardware Entry

Add a row to the table in `hardware.md`:

```markdown
| Device ID | MCU | Driver | Connection | Firmware Doc | API Doc |
```

## Rules

1. **Every device** must appear in both `hardware.md` AND `devices.yaml`
2. **Every firmware** must have its own doc in `firmware/`
3. **Every HTTP/WebSocket API** must have its own doc in `api/`
4. **Source code links** must use relative paths from the repo root
5. **GitHub links** must point to the `main` branch
