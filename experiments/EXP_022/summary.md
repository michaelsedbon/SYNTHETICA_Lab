# EXP_022: Front-Panel 220 V Relay Controller (LIGHTS_1)

**Start Date:** 2026-04-28
**Status:** In progress (firmware + integration done; channel→level mapping pending validation)
**Airtable Links:** None
**Project:** Cryptographic Beings
**Parent:** EXP_014 (Machine Controller), EXP_021 (Front Panel Mapping)
**Hardware:** Arduino Uno R3 → 8-channel relay module (D2..D9) → front-panel per-level 220 V lights

---

## Overview

Add a new device — an **Arduino Uno R3** (designated `LIGHTS_1`) — to the LattePanda controller chain. The Uno drives an **8-channel** mechanical relay module (digital pins **D2–D9**), each channel switching 220 V to a per-level light on the front panel.

> Initial scope was 5 channels mapped to `C03/C05/C06/C07/C08` (per the first user message). Updated 2026-04-28: the relay module is 8-channel on D2–D9, and **all** channels are dedicated to per-level 220 V lights (no rotating-LED rail or 24 V input loads). Channel→level/`C##` mapping is to be confirmed by clicking each toggle and observing which load fires.

The Uno joins the existing `MOTOR_1` Nano on the LattePanda's serial bus and gets controlled through the same FastAPI [Machine Controller](../EXP_014/) on `http://172.16.1.128:8000/`.

## Hardware Setup

| | |
|---|---|
| MCU | Arduino Uno R3 (genuine, USB ID `2341:0043`) |
| USB serial | `/dev/lights_1` (udev symlink — matched by serial `85734323231351D0A1A0`) |
| Baud rate | 115200 |
| Relay module | **8-channel** mechanical relay board (active-LOW logic — typical) |
| Relay → load | 220 V mains → per-level lights on the front panel |

### Pin assignment (Uno → relay module)

| Channel ID | Uno digital pin | Function | Level |
|------------|----------------|----------|-------|
| R1 | D2 | Per-Level 220 V Light | TBD |
| R2 | D3 | Per-Level 220 V Light | TBD |
| R3 | D4 | Per-Level 220 V Light | TBD |
| R4 | D5 | Per-Level 220 V Light | TBD |
| R5 | D6 | Per-Level 220 V Light | TBD |
| R6 | D7 | Per-Level 220 V Light | TBD |
| R7 | D8 | Per-Level 220 V Light | TBD |
| R8 | D9 | Per-Level 220 V Light | TBD |

The exact channel→level (and therefore channel→`C##`) mapping is **pending physical validation** — the procedure is: in the dashboard, click each toggle in turn, observe which level's light comes on, then write down `R<n> → Level <m>`. After the validation pass, the table is updated and [`c_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/c_connector_assignments.md) gets the corresponding C-connector entries flipped to **high** confidence.

## Firmware

[`firmware/lights_uno/`](firmware/lights_uno/) — PlatformIO project for the Uno.

**Protocol** (newline-terminated ASCII @ 115200 baud, mirroring the [`motor_nano`](../EXP_014/firmware/motor_nano/) style so it slots into the existing FastAPI device class):

| Command | Response |
|---------|----------|
| `PING` | `PONG` |
| `IDENTIFY` | `LIGHTS_1` |
| `STATUS` | `R1:0 R2:0 R3:0 R4:0 R5:0 R6:0 R7:0 R8:0` (state of each channel, 0=OFF / 1=ON) |
| `ON <n>` (n=1..8) | `OK ON <n>` |
| `OFF <n>` | `OK OFF <n>` |
| `TOGGLE <n>` | `OK TOGGLE <n> -> <0\|1>` |
| `RELAY <n> <0\|1>` | `OK RELAY <n> <0\|1>` (lower-level alias) |
| `ALL ON` | `OK ALL ON` |
| `ALL OFF` | `OK ALL OFF` |

On boot the Uno sets every relay OFF, blinks the built-in LED twice, and prints `READY LIGHTS_1`.

## Web Interface

The existing FastAPI Machine Controller already has a placeholder "Relays" tab. EXP_022 fills it in:

- **Backend** (`experiments/EXP_014/server/main.py`): new `USBRelayConnection` class, new `relay_devices` section in `devices.yaml`, new endpoints under `/api/relays/<id>/...`.
- **Frontend** (`experiments/EXP_014/server/static/`): relay card template — one card per `LIGHTS_*` device, with one toggle per channel, an "ALL ON" / "ALL OFF" pair, and live state via WebSocket.

Both motors and relays share the same status poller and reconnect logic.

## Goal

Get `http://172.16.1.128:8000/` showing a `LIGHTS_1` card under the Relays tab where each toggle physically clicks a relay and gates 220 V to the corresponding front-panel C connector.

## Progress

### Phase 1: Hardware integration ✅
- [x] Plug Uno into LattePanda
- [x] Identify via `lsusb` / `udevadm` (USB ID `2341:0043`, serial `85734323231351D0A1A0`)
- [x] udev rule → `/dev/lights_1`

### Phase 2: Firmware ⏳
- [x] Create EXP_022 + 4 required doc files
- [ ] Write `firmware/lights_uno/src/main.cpp`
- [ ] Build + flash via the LattePanda
- [ ] Smoke-test PING / STATUS / RELAY commands over serial

### Phase 3: Backend integration 🔲
- [ ] Add `USBRelayConnection` class in `experiments/EXP_014/server/main.py`
- [ ] Add `relay_devices` entry in `devices.yaml`
- [ ] Add API endpoints: `GET /api/relays`, `POST /api/relays/{id}/{channel}/{on|off|toggle}`, `POST /api/relays/{id}/all/{on|off}`
- [ ] Deploy to LattePanda

### Phase 4: Frontend 🔲
- [ ] Relay card template in `static/index.html`
- [ ] Card rendering + WebSocket updates in `static/app.js`
- [ ] CSS for toggles in `static/style.css`

### Phase 5: Validation 🔲
- [ ] Click each toggle → verify the right load fires
- [ ] Update [`c_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/c_connector_assignments.md) with confirmed mapping (resolves the C06/C07/C08 conflict from EXP_021)

## References

- [EXP_021](../EXP_021/summary.md) — Front Panel Mapping (parent — identifies which C carries 220 V)
- [EXP_014](../EXP_014/summary.md) — Machine Controller architecture (FastAPI server we're plugging into)
- [`c_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/c_connector_assignments.md) — living record of front-panel C connectors
- [`motor_nano_dm556`](../../projects/cryptographic_beings/knowledge/firmware/motor_nano_dm556.md) — protocol template the Uno firmware follows
