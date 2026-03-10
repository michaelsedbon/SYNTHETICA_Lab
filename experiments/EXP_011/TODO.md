# EXP_011 — TODO (Cross-Agent Handoff)

Sequential firmware debug of DM542T motor controller. Each step must pass before moving to the next. Any agent can pick up from the current checkpoint.

> **Experiment:** `experiments/EXP_011/`
> **Implementation Plan:** `experiments/EXP_011/implementation_plan.md`
> **Parent:** EXP_005 (working serial, non-moving motor)

---

## Context for New Agents

The motor doesn't physically move despite firmware responding correctly to commands. We're rebuilding firmware from scratch in 9 incremental steps to isolate the failure. Hardware details (pins, driver, motor) are in `implementation_plan.md`.

**Key hardware facts:**
- Nano pins: D4=Step, D2=Dir, D3=Hall
- Driver: DM542T, 24V, ENA not connected
- ESP8266 at 172.16.1.115 bridges WiFi→Serial to Nano
- Flash Nano via USB (`pio run -e nanoatmega328 -t upload`) or OTA via ESP TCP bridge

---

## Firmware Steps

- [ ] **Step 1 — LED Blink**: Flash bare LED blink to Nano, confirm it's alive
  - Folder: `firmware/step_01_blink/`
  - Test: visually see LED blinking

- [ ] **Step 2 — Serial Echo**: Add serial echo, test via ESP `/api/send`
  - Folder: `firmware/step_02_serial/`
  - Test: send text → get it back

- [ ] **Step 3 — Raw GPIO Step** ⚠️ CRITICAL GATE
  - Folder: `firmware/step_03_raw_gpio/`
  - Toggle D4 manually, 200 pulses on boot
  - Test: motor physically moves
  - **If this fails → hardware problem, not firmware. Debug wiring/driver/power.**

- [ ] **Step 4 — Direction Toggle**: Raw GPIO both directions
  - Folder: `firmware/step_04_direction/`
  - Test: motor reverses direction

- [ ] **Step 5 — AccelStepper Blocking**: Use AccelStepper library, blocking move in setup
  - Folder: `firmware/step_05_accelstepper/`
  - Test: motor moves 1000 steps on boot

- [ ] **Step 6 — Serial Commands**: PING + MOVE commands over serial
  - Folder: `firmware/step_06_commands/`
  - Test: MOVE 1000 via ESP → motor moves

- [ ] **Step 7 — Web Dashboard**: Minimal ESP web UI with move/stop buttons
  - Folder: `firmware/step_07_dashboard/`
  - Test: click button → motor moves

- [ ] **Step 8 — Hall Sensor**: Add D3 hall input + HOME command
  - Folder: `firmware/step_08_hall/`
  - Test: STATUS shows hall state, HOME stops at magnet

- [ ] **Step 9 — Full Restore**: All commands + full dashboard
  - Folder: `firmware/step_09_full/`
  - Test: complete feature parity with EXP_005

---

## Post-Completion

- [ ] Update `summary.md` with final results
- [ ] Update `LOG.md` with all session entries
- [ ] Copy working firmware back to EXP_005 if applicable
- [ ] Update EXP_005 `summary.md` status
