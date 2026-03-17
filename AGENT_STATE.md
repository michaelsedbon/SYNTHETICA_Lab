# AGENT_STATE.md — Persistent Memory

*Last updated by: Antigravity agent | 2026-03-14T18:25*

This file is the agent's persistent memory. **Read it on every startup. Update it after every task.**

---

## Mission

I am the SYNTHETICA Lab Agent — an autonomous AI scientist supporting the **Cryptographic Beings** art installation and the **Bio Electronic Music** research project. My goal is to characterise biological systems, build lab infrastructure, and run experiments.

---

## Active Projects

### Cryptographic Beings
Bio-hybrid art installation using Marimo moss balls for binary data storage in 18 tubes (3×6).
- **Machine Controller:** LattePanda Alpha at `http://172.16.1.128:8000` (EXP_014)
- **Level Motor:** ESP8266 at `http://172.16.1.115` (ISD04, EXP_002)
- **Camera:** ESP32-CAM at `http://172.16.1.120`
- **Status:** Phase 5 complete — udev rules, systemd, reconnection, deploy script all working

### Bio Electronic Music
Capturing electrical signals from *P. eryngii* mycelium and transforming them into music.
- **ADC-24 Recording:** `http://172.16.1.80:8000` (EXP_001)
- **LED Stimulation:** `http://leddriver.local` / 172.16.1.126 (EXP_009)
- **Status:** EXP_013 inconclusive — mycelium didn't bridge electrodes. Need re-inoculation.

---

## Machine Knowledge

### Cryptographic Beings Hardware
- **LattePanda Alpha 864s** (172.16.1.128) — Ubuntu 24.04, SSH via `ssh lp`
- **DM556 stepper driver** — 24V, controls NEMA 23 motors via Arduino Nano USB serial
- **Arduino Nano** (MOTOR_1) — AccelStepper DRIVER, D4=Step, D2=Dir, D3=Sensor, 2000 sps, 1000 accel
- **ESP8266** (172.16.1.115) — WiFi controller for ISD04 level motor, web dashboard on :80
- **ISD04 stepper driver** — drives NEMA17 level motor, 12V
- **Hall effect sensor** — on Nano pin D3, detects magnet for homing
- **Steps per revolution: 30,144** (calibrated EXP_002)

### Bio Electronic Music Hardware
- **LED-DRV8:** ESP32-S3 + PCA9685 + 8× DRV8870, REST API at `http://leddriver.local`
- **LED-RING:** ~70 LEDs, passive 12V, driven by LED-DRV8
- **I2C pins:** SDA = GPIO6, SCL = GPIO1
- **Firmware:** `experiments/EXP_009/firmware/`, OTA on port 3232

### Lab Infrastructure
- **Lab Monitor:** ESP8266 + DHT22 sensors → MQTT → `http://172.16.1.80:3008` (deployed 2026-03-13)
- **Production server:** 172.16.1.80 (all apps, Mosquitto MQTT broker)

### Atopile (PCB Design)
- **⚠️ PATH:** Always run with `PATH="/Users/michaelsedbon/.local/bin:$PATH"` — the old `/opt/anaconda3/bin/ato` (v0.2.x) causes stalling/hangs if found first
- **Version:** v0.14.1005 installed via `uv tool install atopile`
- **EXP_008 PCB:** Fully migrated to v0.14. All 21 components use auto-gen packages with LCSC sourcing. Build passes (17/17 stages ✓). Ready for KiCad layout.
- **EXP_012 PCB:** Also uses atopile, same PATH requirement applies

---

## Completed Work

- [x] ESP8266 + Arduino Nano firmware for level motor (EXP_002)
- [x] Rotation calibrated: 30,144 steps per revolution
- [x] Agent API running on :8003 with tool-calling loop (EXP_002)
- [x] Marimo buoyancy simulation model (EXP_003)
- [x] Connector mapper tool — GX16-4 cable continuity testing (EXP_004)
- [x] DM542T motor controller firmware debug — root cause: PCB TX/RX short (EXP_011)
- [x] ESP32 motor controller PCB designed via atopile (EXP_012)
- [x] LED-DRV8 firmware + web dashboard — all 9 pipeline steps complete (EXP_009)
- [x] Mycelium stimulation + recording integration (EXP_010)
- [x] EXP_013 dose-response study — inconclusive, mycelium didn't bridge electrodes
- [x] LattePanda machine controller — FastAPI + dashboard at :8000 (EXP_014, Phase 5)
- [x] Lab Monitor deployed — ESP8266 + DHT22 → MQTT → dashboard at :3008
- [x] 16 applications built and documented
- [x] Persistent memory system audited and improved (2026-03-14)

---

## Open Questions

- [ ] EXP_013: Re-inoculate plate with confirmed electrode bridging — when?
- [ ] EXP_012: ESP32 motor controller PCB — order from JLCPCB?
- [ ] What is the optimal speed/acceleration for smooth Cryptographic Beings movement?
- [ ] Can the machine controller support all 18 tubes (currently 1 DM556 + 1 ISD04)?
- [ ] What experiments should be run once mycelium bridges electrodes?

---

## Next Steps

1. Re-inoculate a new plate for EXP_013 retry (verify electrode bridging under microscope)
2. Expand EXP_014 to support additional motors (MOTOR_2, MOTOR_3, etc.)
3. Order EXP_012 ESP32 motor controller PCBs from JLCPCB
4. Add more sensor nodes to Lab Monitor
5. Begin first biological experiment with confirmed electrode contact
