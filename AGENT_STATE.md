# AGENT_STATE.md — Persistent Memory

*Last updated by: calibration script | 2026-03-02T18:19*

This file is the agent's persistent memory. **Read it on every startup. Update it after every task.**

---

## Mission

I am the SYNTHETICA Lab Agent — an autonomous AI scientist controlling the **Cryptographic Beings machine**, an art/science installation that uses Marimo moss balls (*Aegagropila linnaei*) for biological computation.

My goal is to characterise this machine, make it fully autonomous, and run experiments on the biology.

---

## Machine Knowledge

### Hardware
- **ESP8266** (172.16.1.115) — WiFi controller, serial bridge to Nano, web dashboard on :80
- **Arduino Nano** (ATmega328P) — motor controller, hall sensor reader, runs AccelStepper firmware
- **ISD04 stepper driver** — drives NEMA17 motor, powered by 12V
- **Hall effect sensor** — on Nano pin D3, detects magnet for homing

### Pin Mapping (Nano)
- D5 = STEP (ISD04 pin 5)
- D4 = DIR (ISD04 pin 4)
- D3 = HALL sensor (interrupt)
- D6 = ENABLE (ISD04 pin 6, active LOW)

### Calibration
- **Steps per revolution: 30,144**
- One full rotation = `MOVE 30144`
- Half rotation = `MOVE 15072`
- Angle to steps: `steps = angle/360 × 30144`
- Motor: 200 steps/rev base, with microstepping via ISD04 DIP switches
- Effective gear ratio: ~18.84:1

### Serial Commands
`MOVE <n>`, `MOVETO <pos>`, `HOME`, `STATUS`, `STOP`, `SPEED <sps>`, `ACCEL <a>`, `ENABLE`, `DISABLE`, `ZERO`, `PING`

---

## Completed Work

- [x] ESP8266 firmware deployed with OTA, serial bridge, WebSocket debug
- [x] Arduino Nano firmware deployed with AccelStepper, remote flashing works
- [x] Hall effect sensor verified working (HALL:1 when magnet present)
- [x] Rotation calibrated: 30,144 steps per revolution
- [x] Remote flashing pipeline working (ESP → TCP bridge → STK500v1 → Nano)
- [x] Agent API running on :8003 with tool-calling loop

---

## Open Questions

- [ ] What microstepping ratio is the ISD04 currently set to? (DIP switches)
- [ ] What is the optimal speed/acceleration for smooth movement?
- [ ] Can the agent autonomously write and flash new firmware?
- [ ] What experiments should be run on the Marimo biology?

---

## Next Steps

1. Test HOME command now that hall sensor is confirmed
2. Run a full revolution and verify position accuracy
3. Begin characterising motor behaviour (speed, smoothness, repeatability)
4. Plan first biological experiment (light exposure → buoyancy)

---

## Applications = Git Submodules

**CRITICAL:** Every app in `applications/` is a **git submodule** with its own private GitHub repo at `github.com/michaelsedbon/<app-name>`.

**When modifying any app:**
1. Use `/push-app` workflow to commit + push (submodule first, then main repo pointer)
2. Use `/push-all-apps` to batch push all modified apps
3. Use `/pull-apps` to fetch latest from all submodule remotes
4. **Never** commit app files directly in the main SYNTHETICA_Lab repo — always commit inside the submodule

**13 submodules:** adc24-dashboard, agent-presence, audits, experiment-viewer, fab-planner, lab-agent, launcher, mycelium-sim, plasmid-viewer, research-scout, skill-manager, theme-showcase, virtual-lab

---

## Hardware: LED-DRV8 + LED-RING (EXP_009)

- **LED-DRV8**: ESP32-S3 + PCA9685 + 8× DRV8870, REST API at `http://leddriver.local`
- **LED-RING**: ~70 LED circular array, passive 12V, driven by LED-DRV8
- **I2C pins**: SDA = GPIO6, SCL = GPIO1
- **Firmware**: `experiments/EXP_009/firmware/`, OTA on port 3232
- **API**: `/api/channel`, `/api/all`, `/api/pattern`, `/api/stop`, `/api/status`
