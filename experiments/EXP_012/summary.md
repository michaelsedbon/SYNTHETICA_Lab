# EXP_012: ESP32 Motor Controller — PCB Design

**Start Date:** 2026-03-10
**Status:** In progress
**Airtable Links:** None
**Parent Experiments:** EXP_005, EXP_011

---

## Overview

Custom PCB design to replace the ESP8266 + Arduino Nano dual-chip motor controller (EXP_005) with a single ESP32 board. The current design has a fatal serial TX/RX short on the PCB and the two-chip architecture is unnecessarily complex. This board consolidates everything into one ESP32 with direct DM542T stepper driver control.

## Goal

Design, source, and fabricate (via JLCPCB) a single-board ESP32 motor controller that:
- Controls 1× DM542T stepper driver (STEP + DIR outputs)
- Provides WiFi connectivity (HTTP API + web dashboard)
- Supports OTA firmware updates
- Reads 1× NPN proximity sensor (LJ8A3-2-Z/BX) with pull-up
- Runs from 24V DC with onboard 3.3V regulation
- Fits JLCPCB assembly service (LCSC parts, 2-layer)

## Hardware Reference

- **Motor:** StepperOnline 23HP22-2804S (NEMA 23, 2.8A, 1.20 Nm)
- **Driver:** DM542T (24V supply, PUL+/DIR+ are 3.3V–5V compatible)
- **Sensor:** LJ8A3-2-Z/BX NPN NO proximity sensor
- **Library:** AccelStepper (waspinator v1.64) — DRIVER mode, setMinPulseWidth(20)
- **Confirmed working:** 2000 sps max speed, 1000 acceleration, 500µs pulse timing

## Progress

_Starting — see pcb/ folder for design artifacts._

## Results

_No results yet._

## References

- [EXP_005 — Original dual-chip design](../EXP_005/summary.md)
- [EXP_011 — Motor debug & confirmed AccelStepper config](../EXP_011/summary.md)
