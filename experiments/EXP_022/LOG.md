# EXP_022 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-04-28 — Experiment Created

- Initialised experiment from EXP_014 (Machine Controller) and EXP_021 (Front Panel Mapping).
- Goal: control the front-panel 220 V relay outputs from the existing web dashboard.
- Hardware: new Arduino Uno R3 (USB ID `2341:0043`, serial `85734323231351D0A1A0`) plugged into the LattePanda.
- udev rule appended to `/etc/udev/rules.d/99-machine-controller.rules` matching the unique serial → `/dev/lights_1` symlink. Verified live.
- Designated device ID `LIGHTS_1` to mirror the existing `MOTOR_1` naming.

## 2026-04-28 — Initial 5-channel firmware + integration

- Wrote firmware (5-channel ASCII relay protocol, mirroring `motor_nano` style), compiled + flashed via arduino-cli on the LattePanda (5948 B / 18% flash). PING/STATUS/ON/OFF/TOGGLE/ALL all verified over serial.
- Extended the Machine Controller (EXP_014): new `USBRelayConnection` class, `relay_devices` section in `devices.yaml`, `/api/relays/...` HTTP endpoints, WebSocket `relay_status` broadcasts, status-poller + reconnect coverage.
- Extended the dashboard: relay card template + per-channel toggles + ALL-ON / ALL-OFF buttons, CSS toggle styling, JS WebSocket handler. Empty state shown when no relay devices configured.
- End-to-end verified via curl: `POST /api/relays/LIGHTS_1/all/on`, `POST /api/relays/LIGHTS_1/{n}/{on|off|toggle}`, `POST /api/relays/LIGHTS_1/all/off` — all click physical relays and the status reflects the new state.
- Fixed an early route-ordering bug: `/{relay_id}/all/{action}` had to be declared *before* `/{relay_id}/{channel}/{action}` so FastAPI doesn't try to parse `all` as int.

## 2026-04-28 — Updated to 8 channels (D2–D9), all per-level 220 V lights

- User clarified: relays are wired to **digital pins D2–D9** (8 channels), and **all** of them drive per-level 220 V lights — no rotating-LED rails or 24 V loads.
- Bumped firmware: `NUM_RELAYS=8`, `RELAY_PINS = {2,3,4,5,6,7,8,9}`. Re-compiled (5952 B / 18% flash) and flashed via arduino-cli (had to stop the machine-controller service first to release `/dev/lights_1`, then restart).
- Updated `devices.yaml`: `num_channels: 8`, generic per-level light labels for R1..R8 with TBD level numbers (channel→level mapping is the pending validation step).
- UI shows 8 toggles automatically (`renderRelays` loops `relay.num_channels`). Tag line on each row now falls back to MCU pin label (`D2`, `D3`, …) when no `c_connector` is set.
- Dropped the previous channel→C-connector guesses (C03/C05/C06/C07/C08) from the EXP_022 docs — they were based on the original mixed-function hypothesis from EXP_021 which the user has now corrected.
