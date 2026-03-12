# EXP_014 — LattePanda Alpha Serial Machine Controller

## Experiment Prompt

> Create a new experiment **EXP_014** — a LattePanda Alpha-based machine controller for the Cryptographic Beings installation. This is a **full machine control platform**, not just motor control.

### Context & Motivation

The ESP8266 + Arduino Nano WiFi bridge for DM556 motor control **failed** due to a fatal PCB TX/RX short (EXP_005 → EXP_011). However, **direct USB serial to the Arduino Nano works perfectly** — EXP_011 Steps 1–6 all passed (AccelStepper DRIVER mode, 2000 sps, 1000 accel, 20 µs min pulse, serial commands PING/MOVE/STATUS all work over USB).

**New approach:** Skip wireless entirely. Use the **LattePanda Alpha 864s** running Ubuntu, connected via USB serial to the Arduino Nanos. The LattePanda hosts a local web app and a fully documented REST API — controllable from the browser, from the lab server, or from **Antigravity agents sending HTTP commands**.

### Hardware

| Component | Details |
|-----------|---------|
| **Controller** | [LattePanda Alpha 864s](https://www.lattepanda.com/lattepanda-alpha) — Intel i5-8210Y, 8GB RAM, 3× USB 3.0 + 1× USB-C, Gigabit Ethernet, WiFi AC, built-in Arduino Leonardo |
| **OS** | Ubuntu 24.04 LTS (same as lab server for consistency) |
| **Motor driver** | **DM556 (Yundan)**, 24V DC, up to 5.6A |
| **Motor** | StepperOnline 23HP22-2804S (NEMA 23, 2.8A, 1.20 Nm) |
| **Sensor** | LJ8A3-2-Z/BX NPN NO proximity probe |
| **Interface** | Arduino Nano via USB serial (115200 baud) |
| **Confirmed config** | AccelStepper DRIVER mode, D4=Step, D2=Dir, D3=Hall |

### Architecture — Modular Device Platform

The system controls **multiple device types**, not just motors. Current devices: 1 motor + 1 sensor. Future: 4 motors + 4 sensors + relay board(s) + ESP cameras + other peripherals.

```
┌────────────────────────────────────────────────────────────────────┐
│                    LattePanda Alpha (Ubuntu 24.04)                  │
│                                                                    │
│  ┌──────────────┐    ┌─────────────────────────────────────────┐   │
│  │   Web App     │    │   Python Backend (FastAPI)               │   │
│  │  (Browser UI) │◄──►│                                         │   │
│  │  HTML/JS/CSS  │    │  ┌──────────────────────────────────┐   │   │
│  │  Based on     │    │  │   Device Manager                 │   │   │
│  │  Skill Mgr    │    │  │                                  │   │   │
│  │  dashboard    │    │  │  Serial Devices (USB):           │   │   │
│  │  design       │    │  │   /dev/motor1 ──► Nano (Motor 1) │   │   │
│  └──────────────┘    │  │   /dev/motor2 ──► Nano (Motor 2) │   │   │
│                       │  │   /dev/motor3 ──► Nano (Motor 3) │   │   │
│       ▲               │  │   /dev/motor4 ──► Nano (Motor 4) │   │   │
│       │               │  │                                  │   │   │
│  External API         │  │  Network Devices (future):       │   │   │
│  (Antigravity /       │  │   Relay board (I²C or serial)    │   │   │
│   Server / Mac)       │  │   ESP cameras (HTTP/MJPEG)       │   │   │
│                       │  │   Other peripherals              │   │   │
│                       │  └──────────────────────────────────┘   │   │
│                       └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
       │USB          │USB          │USB          │USB
┌──────┴──────┐┌─────┴──────┐┌─────┴──────┐┌─────┴──────┐
│ Arduino Nano ││Arduino Nano││Arduino Nano││Arduino Nano│
│  Motor 1     ││  Motor 2   ││  Motor 3   ││  Motor 4   │
│  Sensor 1    ││  Sensor 2  ││  Sensor 3  ││  Sensor 4  │
│  DM556       ││  DM556     ││  DM556     ││  DM556     │
└─────────────┘└────────────┘└────────────┘└────────────┘
```

### Software Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **OS** | Ubuntu 24.04 LTS | Same as lab server — consistent tooling |
| **Backend** | Python + FastAPI | REST API + WebSocket for real-time updates |
| **Serial** | pyserial | USB serial to Nanos |
| **Frontend** | Vanilla HTML/JS/CSS | Based on **Skill Manager** dashboard design (dark theme, card grid, sidebar) |
| **Process mgr** | systemd service | Auto-start on boot, headless operation |
| **Remote access** | SSH | Full control from Mac + lab server |

### API Design — Full External Control

Every command must be exposed via REST so that **Antigravity agents on Mac or server can send commands** to the LattePanda over the network:

```
# Device management
GET  /api/devices                          → list all connected devices
GET  /api/devices/{id}/status              → device status

# Motors
POST /api/motors/{id}/move     {steps}     → relative move
POST /api/motors/{id}/moveto   {position}  → absolute move
POST /api/motors/{id}/home                 → home to sensor
POST /api/motors/{id}/stop                 → emergency stop
POST /api/motors/{id}/calibrate            → full rotation calibration
GET  /api/motors/{id}/status               → position, homed, sensor state
PUT  /api/motors/{id}/config   {speed,accel} → update parameters

# Sensors (proximity probes visible in motor status, but also independently)
GET  /api/sensors/{id}/status              → sensor reading

# System
POST /api/system/scan                      → rescan all USB ports
GET  /api/system/health                    → system + device health check

# Future endpoints (relay, cameras)
POST /api/relays/{id}/set      {state}     → set relay state
GET  /api/cameras/{id}/stream              → MJPEG stream URL
```

### Device Identification — Dual Strategy

Use **both** approaches together for maximum reliability:

1. **udev rules** — Assign persistent symlinks by USB **port path** (e.g., `/dev/motor1` always maps to physical USB port 1, regardless of which Nano is plugged in)
2. **Identity tagging** — Each Nano firmware has a compiled-in `DEVICE_ID` (e.g., `MOTOR_1`). On startup, the backend sends `IDENTIFY` to each port and maps the response to the device registry. This tells the system *which motor* is on *which port*

If a Nano is moved to a different USB port, identity tagging catches it. If a Nano is replaced, the udev rule keeps the port mapping.

### Web Dashboard — Design Reference

Base the frontend on the **Skill Manager** dashboard style:
- Dark theme (VS Code-inspired tokens: `#1e1e1e` base, `#252526` surface)
- Inter + JetBrains Mono fonts
- Card grid layout with device cards
- Sidebar showing device tree / categories
- Lucide icons

**Dashboard pages/views:**
- **Overview** — All device cards at a glance (motors, sensors, relays, cameras)
- **Motor Control** — Per-motor card: position display, ±step buttons, speed/accel sliders, home button, proximity sensor indicator (live green/red dot)
- **System** — Device scan, connection log, system health

> [!NOTE]
> The frontend design needs a dedicated brainstorming session — the end goal is a **full machine control interface** with many different functions. Start with motor control but design the layout to be extensible.

### Key Considerations

1. **Ubuntu 24.04 Installation** — The LattePanda Alpha ships with Windows. We'll need a bootable USB with Ubuntu 24.04 and likely the [LattePanda-specific BIOS settings](https://docs.lattepanda.com/). I will guide the installation step by step
2. **SSH Setup** — Configure SSH server on the LattePanda for full remote access from your Mac and from the lab server. Set up key-based auth + hostname alias (e.g., `ssh lpcb`)
3. **Power Budget** — 4× DM556 at 24V could draw up to 22A total. Need a beefy 24V PSU (recommend 24V/30A)
4. **Nano Firmware** — Reuse EXP_011 Step 6 firmware (already working). Add `IDENTIFY` command returning compile-time `DEVICE_ID`
5. **Cable Management** — 4× USB, 4× motor cables, 4× sensor cables, power. Plan physical routing
6. **Error Handling** — Reconnection logic when a Nano disconnects. UI shows disconnected state. Auto-rescan on USB hotplug via `pyudev`
7. **Choreography (future)** — Coordinated multi-motor sequences (`POST /api/choreography`). Not in scope for EXP_014 Phase 1 but the architecture must support it
8. **Built-in Arduino Leonardo** — The LattePanda Alpha has a built-in Arduino Leonardo co-processor. Could potentially use it for local I/O (relay control, additional sensors) without needing an external Nano for non-motor tasks

### Phases

| Phase | Scope |
|-------|-------|
| **Phase 1** | Install Ubuntu 24.04 on LattePanda, configure WiFi, SSH from Mac + server |
| **Phase 2** | Connect 1 Nano via USB, verify serial PING/MOVE from Python |
| **Phase 3** | Build FastAPI backend: device manager, serial manager, REST API for 1 motor |
| **Phase 4** | Build web dashboard (Skill Manager-style, 1 motor card, move controls, proximity sensor status) |
| **Phase 5** | Auto-discovery + udev rules + identity tagging, test with 2+ motors |
| **Phase 6** | Harden: systemd service, error handling, reconnection, USB hotplug |
| **Phase 7** | Extend: relay board integration, ESP camera feeds, choreography API |

### References

- [EXP_005 — Original DM556 setup](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_005/summary.md)
- [EXP_011 — Confirmed working serial config](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_011/LOG.md)
- [EXP_012 — ESP32 PCB redesign (alternative approach)](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_012/summary.md)
- [Skill Manager — Dashboard design reference](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/skill-manager/index.html)
- [LattePanda Alpha specs](https://www.lattepanda.com/lattepanda-alpha)
