# EXP_011: Sequential Motor Firmware Debug (DM542T)

**Start Date:** 2026-03-10
**Status:** In progress
**Airtable Links:** None
**Parent Experiment:** EXP_005

---

## Overview

Fresh-start debug of the DM542T motor controller from EXP_005. The motor physically does not move despite serial communication working correctly (PING→PONG, STATUS returns data, MOVE returns OK). Instead of debugging the existing complex firmware, we strip everything down and rebuild incrementally — one function per firmware version — to isolate the failure point.

## Goal

Get the NEMA 23 motor (StepperOnline 23HP22-2804S) physically moving via the Arduino Nano → DM542T driver chain, then rebuild full functionality one step at a time.

## Hardware

- **Motor:** StepperOnline 23HP22-2804S (NEMA 23, 2.8A, 1.20 Nm)
- **Driver:** DM542T (24V supply)
- **Controller:** Arduino Nano (ATmega328P) + ESP8266 (NodeMCU) WiFi bridge
- **Pins:** D4=Step, D2=Dir, D3=Hall, D5(ESP)=Nano Reset

## Progress

- [x] **Step 1 (LED Blink):** Flashed via USB — LED blinks ✅. OTA via ESP appears to succeed but firmware doesn't take effect.
- [x] **Step 3 (Raw GPIO):** Motor physically moves with raw `digitalWrite()` pulses on D4/D2. **Hardware confirmed good.**
- [x] **Step 5 (AccelStepper):** Blocking move of 1000 steps works on boot. Position tracking correct.
  - Library: AccelStepper (waspinator v1.64) — DRIVER mode
  - Confirmed working: 2000 sps max speed, 1000 acceleration, `setMinPulseWidth(20)`
- [x] **Step 6 (Serial Commands):** All serial commands work over USB — PING→PONG, MOVE, STATUS.
- ❌ **Step 7 (ESP Bridge):** **FAILED** — Motor does not move when commands sent through ESP WiFi bridge. ESP logs show TX but zero RX.

## Results

### Root Cause Found

**Nano TX (D1) is connected to both ESP RX AND ESP TX on the PCB.** This shorts two outputs together (ESP TX and Nano TX on the same trace), corrupting all serial communication in both directions. This is a fatal PCB design defect.

Correct wiring should be:
- ESP TX → Nano RX (D0) only
- Nano TX (D1) → ESP RX only

### Confirmed Working Hardware Config
| Parameter | Value |
|-----------|-------|
| Motor | StepperOnline 23HP22-2804S (NEMA 23, 2.8A) |
| Driver | DM542T at 24V |
| Max speed | 2000 steps/s |
| Acceleration | 1000 steps/s² |
| Min pulse width | 20 µs (via `setMinPulseWidth(20)`) |
| Pins | D4=Step, D2=Dir, D3=Hall |

### Decision
Redesign the motor controller PCB using a single **ESP32** → **EXP_012**.

## References

- [EXP_005 Summary](../EXP_005/summary.md)
- [Implementation Plan](implementation_plan.md)
- [TODO — Cross-Agent Handoff](TODO.md)
