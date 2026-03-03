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
                    │   │ (AccelStepper) │ │
                    │   └────────────────┘ │
                    └──────────────────────┘
```

## Machine: Cryptographic Beings

- **ESP8266** (172.16.1.115): WiFi controller, OTA-capable, OLED display
  - Firmware: `experiments/EXP_002/firmware/esp8266_ota/`
  - OTA: `/home/michael/.pio-venv/bin/pio run -e ota -t upload -d <firmware_dir>`
  - Web dashboard: http://172.16.1.115/
  - Status API: http://172.16.1.115/status
  - Reset Nano: http://172.16.1.115/reset-nano
  - TCP serial bridge: port 2323 (raw bytes ↔ Nano serial)

- **Arduino Nano** (ATmega328P): Motor controller using AccelStepper library
  - Firmware: `experiments/EXP_002/firmware/arduino_nano/`
  - Library: AccelStepper (type DRIVER — step + direction)
  - Remote flash: `python3 experiments/EXP_002/firmware/flash_nano.py`
  - Commands via serial (115200 baud):
    - `MOVE <n>` — relative move (steps)
    - `MOVETO <n>` — absolute move (position)
    - `HOME` — home to hall sensor
    - `STATUS` — position, speed, enabled, hall, moving
    - `STOP` — emergency stop
    - `SPEED <sps>` — set max speed (steps/sec, default 2000)
    - `ACCEL <a>` — set acceleration (steps/sec², default 1000)
    - `ENABLE` / `DISABLE` — motor driver enable
    - `ZERO` — reset position counter
    - `PING` — connectivity check → `PONG`

- **ISD04** (integrated NEMA17 stepper driver)
  - Power: 12V DC on pin 1 (V+), pin 2 (GND)
  - Signal reference: pin 3 (VCC) ← **must connect to Nano 5V**
  - DIP switches control microstepping: set to 1/8 or 1/16 for smoother motion

## Wiring

| ESP Pin | Nano Pin | Purpose |
|---------|----------|---------|
| TX | D0 (RX) | Serial commands |
| GND | GND | Common ground |
| D5 (GPIO14) | RST | Remote reset for flashing |

| Nano Pin | ISD04 Pin | Purpose |
|----------|-----------|---------|
| D5 | Pin 5 (STP) | Step pulse |
| D4 | Pin 4 (DIR) | Direction |
| D6 | Pin 6 (ENA) | Enable (active LOW) |
| D3 | — | Hall effect sensor (interrupt) |
| 5V | Pin 3 (VCC) | Signal reference voltage |
| GND | Pin 2 (GND) | Shared ground |

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

## Routing & Safety

### LLM Routing

When Gemini is available, **all tasks** go through Plan-Execute-Reflect:
1. **Plan** (Gemini) — decomposes the goal into numbered steps
2. **Execute** (Ollama) — runs each step via bounded ReAct loop
3. **Reflect** (Gemini) — summarises outcomes, updates AGENT_STATE.md

When Gemini is unavailable, falls back to a direct Ollama ReAct loop.

### Source-Based Tool Restrictions

Every `chat()` call carries a `source` tag:

| Source | Origin | Restrictions |
|--------|--------|-------------|
| `user` | `/api/agent/chat`, WebSocket | Full tool access |
| `scheduler` | Cron tasks (`hourly_status`, etc.) | Blocked: MOVE, MOVETO, HOME, STOP, SPEED, ACCEL, ENABLE, DISABLE, ZERO, LIGHT, LEVEL. Blocked tools: `run_command`, `run_experiment_script` |
| `telegram` | Telegram bot bridge | Same restrictions as scheduler |

Blocked calls return a `BLOCKED: ...` message to the LLM and are logged with ⛔ in the timeline.

**Rationale:** See `2026-03-03_agent_routing_incident.md` for the incident that motivated these constraints.

## Agent Skills

Skills are documented in `applications/lab-agent/skills/`. Each skill has instructions
the agent can follow to accomplish specific tasks.

| Skill | What it does |
|-------|-------------|
| `flash_esp.md` | Update ESP firmware via OTA |
| `flash_nano.md` | Update Nano firmware remotely via TCP bridge |
| `machine_control.md` | Send commands to the machine, safety rules |

## Key Paths

| Path | Content |
|------|---------|
| `experiments/EXP_002/firmware/esp8266_ota/` | ESP8266 firmware (PlatformIO) |
| `experiments/EXP_002/firmware/arduino_nano/` | Nano firmware with AccelStepper (PlatformIO) |
| `experiments/EXP_002/firmware/flash_nano.py` | Remote Nano flasher (STK500v1 over TCP) |
| `applications/lab-agent/` | Agent code (core, tools, server) |
| `applications/lab-agent/ARCHITECTURE.md` | This file |
| `applications/lab-agent/skills/` | Agent skill documents |
| `papers_txt/INDEX.md` | Paper corpus index |

## PlatformIO

Installed in `/home/michael/.pio-venv/bin/pio` (PlatformIO 6.1.19).
Always use full path: `/home/michael/.pio-venv/bin/pio`
