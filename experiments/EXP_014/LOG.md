# EXP_014 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-12 — Experiment Created

- Initialised experiment folder from template.
- Goal: Build a LattePanda Alpha-based serial machine controller for the Cryptographic Beings installation, replacing the failed ESP WiFi bridge with direct USB serial to Arduino Nanos.
- Parent experiments: EXP_005 (original DM556 setup), EXP_011 (serial debug — confirmed working), EXP_012 (ESP32 PCB redesign).
- Downloaded LattePanda Alpha documentation (specs, BIOS guide, OS installation guide).

## 2026-03-12 — Phase 1: Ubuntu Installation & SSH Setup

- **Ubuntu 24.04.4 LTS** installed on LattePanda Alpha 864s (eMMC, 56 GB).
- Booted from USB created with `dd` on Mac. BIOS boot via "UEFI OS (Generic)" option.
- Hostname: `michael-LattePanda-Alpha`, user: `michael`.
- Connected to MEDICALEX WiFi, IP: `172.16.1.128`.
- SSH server installed and enabled (`openssh-server`).
- **SSH key-based auth** configured (Mac → LattePanda, passwordless).
- SSH alias `lp` added to `~/.ssh/config` on Mac.
- **Passwordless sudo** configured for user `michael`.
- Python venv created at `~/machine-controller` with:
  - FastAPI 0.135.1, uvicorn 0.41.0
  - pyserial 3.5, pyudev 0.24.4
  - websockets 16.0, pyyaml 6.0.3
- APT packages: python3-pip, python3-venv, git, curl, build-essential.
- System info logged to `SYSTEM_INFO.md`.
- **Phase 1 complete ✅**

## 2026-03-12 — Phase 2: Serial Communication

- Arduino Nano detected on `/dev/ttyUSB1` (CH340 serial converter).
- Flashed EXP_011 firmware via PlatformIO from LattePanda.
- Verified PING → PONG, STATUS, MOVE commands over serial.
- Motor physically moved 2000 steps. Full chain confirmed: Mac → SSH → LP → Python → USB → Nano → DM556 → Motor.
- Proximity sensor wired (Brown→Red=VCC, Blue→Yellow=GND, Black→White=Signal→D3).
- User `michael` added to `dialout` group for serial port access.
- **Phase 2 complete ✅**

## 2026-03-12 — Phase 3: Backend + Web Dashboard

- Built FastAPI backend (`server/main.py`): serial DeviceManager, REST API, WebSocket.
- Built web dashboard (`server/static/`): Skill Manager-style dark theme, motor card, sliders, log panel.
- Deployed to LattePanda `~/machine-controller-app/`. Server runs on port 8000.
- Dashboard verified: MOTOR_1 card with position, speed, move controls, Home/Zero/Stop buttons.
- API tested: `POST /api/motors/MOTOR_1/move?steps=500` → motor moved ✅.
- WebSocket real-time status updates working.
- **Phase 3 complete ✅**

## 2026-03-12 — Phase 4A: ISD04 Level Motors + Device Registry

- Refactored backend to support two device types: `USBMotorConnection` (DM556) and `ESPMotorConnection` (ISD04 via HTTP).
- Created `devices.yaml` config with experiment refs, firmware paths, and hardware notes for each device.
- Added LEVEL_1 (EXP_002 Cryptographic Beings ISD04 motor at `172.16.1.115`) as an ESP HTTP device.
- Added `/api/motors/{id}/sensor` endpoint for manual sensor verification before calibration.
- Added `/api/system/config` endpoint exposing full device registry.
- Added `/api/motors/{id}/calibrate` and `/api/motors/{id}/half` endpoints for ESP-specific commands.
- Dashboard updated: ESP cards with orange accent, Calibrate/Half buttons, description line, experiment refs in footer.
- Installed `httpx` on LattePanda for async HTTP proxy.
- ESP at 172.16.1.115 currently offline (firmware being reflashed by another agent).
- **Phase 4A complete ✅**

## 2026-03-12 — Phase 4B: Firmware Flash + Sensor Verification

- Flash from LattePanda failed consistently — DTR auto-reset blocked by motor control PCB.
- Tried: PlatformIO upload (both bootloaders), manual DTR pulse, system avrdude v7.1, retry loops with manual reset.
- **Solution:** User unplugged Nano from PCB, plugged directly into LP USB, flashed at **57600 baud** (old bootloader, not 115200).
- EXP_014 firmware verified: `IDENTIFY` → `MOTOR_1`, `STATUS` → includes `SENSOR:0`.
- Fixed `platformio.ini` to `nanoatmega328` with `upload_speed = 57600`.
- Fixed server `connect()` boot timing: drain buffer in loop (5×200ms) before PING.
- Both devices now connected: `MOTOR_1` (USB) + `LEVEL_1` (ESP HTTP, fixed by another agent).
- LEVEL_1 already calibrated: `hall:1, calibrated:1, spr:29749`.
- Proximity sensor showing `SENSOR:0` — needs manual verification (bring metal to sensor, watch value change in dashboard).
- **Phase 4B firmware flash complete ✅ — sensor verification pending**
- Proximity sensor works but 3D-printed trigger part is not metal — needs redesign with metal part.

## 2026-03-12 — Phase 4C: Manual Calibration + Level % + Tabbed Dashboard

### Manual Calibration & Level %
- Added `max_steps` property to `USBMotorConnection` — loaded from `devices.yaml` on boot.
- Added **Max Steps** input field + **SET** button to motor cards (both USB and ESP).
- Added **Level %** slider (0–100%) + **GO** button — moves motor to percentage of max_steps.
- Negative max_steps supported (travel goes in negative direction from zero).
- `max_steps` persisted to `devices.yaml` via `save_max_steps()` — survives server restarts.
- Position display shows `pos (%)` when max_steps is set.
- API endpoints:
  - `PUT /api/motors/{id}/max_steps?value=N` — set max travel
  - `GET /api/motors/{id}/level` — current position as %
  - `POST /api/motors/{id}/level?percent=N` — move to percentage
- Added sensor beep: 800Hz tone via Web Audio API on 0→1 sensor transition.

### Tabbed Dashboard
- Restructured dashboard with **top tab bar** (Lucide icons, no emoji):
  - **Motors** tab — existing motor cards (MOTOR_1, LEVEL_1)
  - **Cameras** tab — ESP32-CAM cards with MJPEG stream/capture/stop
  - **Relays** tab — placeholder ("coming soon")
- Camera device type (`esp_camera`) added to backend and `devices.yaml`.
- Camera probed via HTTP `/capture` on startup.
- Camera card: live MJPEG stream embed, capture snapshot, stop stream.
- Added `camera_devices` section to `devices.yaml` (CAM_1 at `172.16.1.120` — IP needs verification).
- Architecture designed for future expansion: add devices to `devices.yaml`, auto-routed to correct tab.

### Files Modified
- `server/main.py` — camera scanning, max_steps, level %, save_max_steps
- `server/static/index.html` — tab bar, camera card template, level controls
- `server/static/app.js` — tab switching, camera card creation, sensor beep, level UI
- `server/static/style.css` — tab bar, camera card, input styling
- `server/devices.yaml` — camera_devices section, max_steps persistence
- `firmware/motor_nano/platformio.ini` — fixed to `nanoatmega328` with 57600 baud

### Pending
- [ ] Verify ESP32-CAM IP address (power on camera and scan network)
- [ ] Redesign proximity sensor trigger part in metal
- **Phase 4C complete ✅**

## 2026-03-13 — Phase 5: Production Hardening

### Udev Rules
- Created `/etc/udev/rules.d/99-machine-controller.rules` on LattePanda.
- Stable symlink: `/dev/motor_1` using VID/PID match (`1A86:7523` — standard CH340G).
- Updated `devices.yaml` to use `/dev/motor_1` instead of `/dev/ttyUSB1`.

### Systemd Service
- Created `/etc/systemd/system/machine-controller.service` — auto-starts on boot.
- Runs as `michael` user via venv uvicorn.
- `Restart=always` with 5s delay — survives crashes.
- `systemctl enable machine-controller` — enabled for boot.

### Error Handling & Reconnection
- **Fixed CH340 bug:** removed vendor allowlist (`0x1A86, 0x0403, 0x2341`) from `scan_and_connect()`. Now fully config-driven — connects to ports listed in `devices.yaml`.
- **USB reconnection:** background task checks disconnected USB devices every 15s, reconnects if port reappears.
- **ESP reconnection:** re-probes disconnected ESP devices every 15s.
- **Camera reconnection:** re-probes disconnected cameras every 15s.
- **Serial error handling:** catches `serial.SerialException` specifically, cleans up connection, marks disconnected.

### Deploy Script
- Created `server/deploy.sh` — rsync code to LP + systemctl restart + health check.

### USB Hub Debugging
- Initial udev rule targeted `04E2:1410` (thought to be CH340 clone) — turned out to be an **Exar XR21V1410 USB-UART** built into the USB hub, not the Nano.
- Real Nano uses standard CH340G (`1A86:7523`). Updated udev rule to match by VID/PID.
- **brltty fix:** Ubuntu's `brltty` (Braille display daemon) was hijacking the CH340 USB interface through the hub. `dmesg` showed: `usbfs: interface 0 claimed by ch341 while 'brltty' sets config #1`. Fixed by `sudo apt remove brltty`.
- Nano now works both direct and through hub → `/dev/motor_1`.

### Files Modified
- `server/main.py` — config-driven scan, reconnection_poller, SerialException handling
- `server/devices.yaml` — `/dev/motor_1` symlink
- `server/deploy.sh` — [NEW] deployment script

### Status
- MOTOR_1 (USB Nano): ✅ connected via hub → `/dev/motor_1`
- LEVEL_1 (ESP8266): ✅ connected → `172.16.1.115`
- CAM_1 (ESP32-CAM): ✅ connected → `172.16.1.120`
- **Phase 5 complete ✅**

