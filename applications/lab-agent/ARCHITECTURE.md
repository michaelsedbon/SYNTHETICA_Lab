# SYNTHETICA Lab — Architecture

## System Overview

The lab has an autonomous AI agent running on the local server (`172.16.1.80`).
The agent can control hardware, write code, run experiments, and flash firmware — all remotely.

## Network Map

```
                    ┌──────────────────────┐
                    │   Server             │
                    │   172.16.1.80        │
                    │                      │
                    │   ┌────────────────┐ │
                    │   │ Ollama Agent   │ │
                    │   │ :8003 (API)    │ │
                    │   │ qwen2.5:14b   │ │
                    │   └──────┬─────────┘ │
                    │          │ HTTP/TCP   │
                    └──────────┼────────────┘
                               │ WiFi
                    ┌──────────┼────────────┐
                    │   ESP8266             │
                    │   172.16.1.115        │
                    │   :80  (dashboard)    │
                    │   :81  (WebSocket)    │
                    │   :2323 (TCP bridge)  │
                    │          │ Serial     │
                    │   ┌──────┴─────────┐ │
                    │   │ Arduino Nano   │ │
                    │   │ Motor control  │ │
                    │   └────────────────┘ │
                    └──────────────────────┘
```

## Machine: Cryptographic Beings

- **ESP8266** (172.16.1.115): WiFi controller, OTA-capable, OLED display
  - Firmware: `experiments/EXP_002/firmware/esp8266_ota/`
  - OTA: `pio run -e ota -t upload -d <firmware_dir>`
  - Web dashboard: http://172.16.1.115/
  - Status API: http://172.16.1.115/status
  - Reset Nano: http://172.16.1.115/reset-nano
  - TCP serial bridge: port 2323 (raw bytes ↔ Nano serial)

- **Arduino Nano** (ATmega328P): Motor controller via ISD04 stepper driver
  - Firmware: `experiments/EXP_002/firmware/arduino_nano/`
  - Commands via serial (115200 baud): MOVE <n>, HOME, STATUS, STOP, SPEED <us>, PING
  - Remote flash: `python3 experiments/EXP_002/firmware/flash_nano.py`

## Wiring

| ESP Pin | Nano Pin | Purpose |
|---------|----------|---------|
| TX | D0 (RX) | Serial commands |
| GND | GND | Common ground |
| D5 (GPIO14) | RST | Remote reset for flashing |
| D1 | - | OLED SCL |
| D2 | - | OLED SDA |

| Nano Pin | Connection | Purpose |
|----------|-----------|---------|
| D4 | ISD04 PUL+ | Step pulse |
| D5 | ISD04 DIR+ | Direction |
| D6 | ISD04 ENA+ | Motor enable |
| D2 | Hall sensor | Position feedback |

## Agent API (port 8003)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/chat` | Send message, get events |
| GET | `/api/agent/status` | Active agent sessions |
| GET | `/api/agent/sessions` | All saved sessions |
| GET | `/api/agent/timeline/{id}` | Session timeline events |
| GET | `/api/files/list?path=` | Browse workspace files |
| GET | `/api/files/read?path=` | Read file content |
| WS | `/ws/agent` | Real-time event stream |

## Agent Skills

Skills are documented in `applications/lab-agent/skills/`. Each skill has instructions
the agent can follow to accomplish specific tasks.

| Skill | What it does |
|-------|-------------|
| `flash_esp.md` | Update ESP firmware via OTA |
| `flash_nano.md` | Update Nano firmware remotely |
| `machine_control.md` | Send commands to the machine |

## Key Paths

| Path | Content |
|------|---------|
| `experiments/EXP_002/firmware/` | All firmware source code |
| `experiments/EXP_002/firmware/esp8266_ota/` | ESP8266 firmware (PlatformIO) |
| `experiments/EXP_002/firmware/arduino_nano/` | Nano firmware (PlatformIO) |
| `experiments/EXP_002/firmware/flash_nano.py` | Remote Nano flasher script |
| `applications/lab-agent/` | Agent code (core, tools, server) |
| `papers_txt/INDEX.md` | Paper corpus index |
| `experiments/EXP_003/summary.md` | Marimo biology knowledge |

## PlatformIO

Installed in `/home/michael/.pio-venv/bin/pio` (PlatformIO 6.1.19).
Always use full path: `/home/michael/.pio-venv/bin/pio`
