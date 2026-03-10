# EXP_011 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-10 — Experiment Created

- Initialised experiment folder from template.
- Goal: Sequential firmware debug of DM542T motor controller — build up from bare LED blink to full motor control, one function at a time.
- Branched from EXP_005 which had working serial but non-moving motor.
- Implementation plan created with 9 incremental firmware steps.

## 2026-03-10 — Sequential Firmware Debug Session

### Steps 1–6: All Passed via USB Serial
- **Step 1 (LED Blink):** Flashed via USB — LED blinks ✅. OTA flash through ESP appeared to succeed but firmware didn't take effect (LED didn't blink). USB flash is reliable, OTA is not.
- **Step 3 (Raw GPIO):** Motor physically moves with raw `digitalWrite()` pulses on D4 (step) and D2 (dir). 200 pulses forward + 200 reverse. **Hardware confirmed good.**
- **Step 5 (AccelStepper):** Blocking move of 1000 steps works on boot. Position tracking correct (pos=1000).
- **Step 6 (Serial Commands):** PING→PONG, MOVE 2000 → motor physically moved, STATUS shows pos=3000. All serial commands work perfectly over USB.

### Step 7: ESP Bridge Test — FAILED ❌
- PING through ESP WiFi bridge returns TIMEOUT on two different PCBs.
- ESP logs show only TX entries, zero RX — Nano never responds.
- Motor does NOT move when commands sent through ESP bridge.
- Even after Nano reset via D5, serial remains dead.

### Root Cause Found
**Nano TX (D1) is connected to both ESP RX AND ESP TX on the PCB.** This shorts two outputs together (ESP TX and Nano TX on the same trace), corrupting all serial communication in both directions.

Correct wiring should be:
- ESP TX → Nano RX (D0) only
- Nano TX (D1) → ESP RX only

### Decision
Redesign the motor controller PCB using a single **ESP32** to eliminate the dual-chip ESP8266+Nano architecture entirely. New experiment: EXP_012.
