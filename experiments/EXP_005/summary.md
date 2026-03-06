# EXP_005: High-Power Motor Control (DM542T)

**Start Date:** 2026-03-04
**Status:** In progress
**Airtable Links:** None

---

## Overview

This experiment documents the setup and configuration of a separate motor control PCB designed for **DM542T or Yundan DM556** external digital stepper drivers. 

Compared to the standard Motor Level Controller (EXP_002), this hardware revision:
- Uses NEMA 23/34 high-power motors.
- Operates at **24V DC**.
- Supports **DM556** (higher current, up to 5.6A).
- Features an **MCP23017 I/O expander**.
- Includes **screw terminals** for proximity probes and power.
- Uses a unique pin mapping (D4=Step, D2=Dir, D7=Hall).

## Goal

Successfully configure, flash, and verify motor control boards using the bare ESP8266 + Arduino Nano dual-tier architecture over WiFi (OTA).

## Progress

- Reverse engineered board from photos and old code.
- Identified pin mapping: **D4 (Step)**, **D2 (Dir)**, **D7 (Hall)**, **D5 (Nano Reset)**.
- Established dedicated EXP_005 workspace to avoid conflicts with EXP_002 production hardware.
- **2026-03-06**: Rewrote firmware from scratch (barebone) to debug serial communication issues.
- ✅ Serial communication verified (PING → PONG, STATUS, MOVE).
- ✅ Web dashboard deployed with motor controls and connection status indicator.
- ✅ Motor control commands: MOVE, HOME, CALIBRATE, HALF, STOP, SPEED, ACCEL.

## Results

- ESP8266 and Arduino Nano communicate reliably over serial at 115200 baud.
- Web dashboard at `http://172.16.1.115/` provides full motor control.
- OTA flashing works for both ESP (ArduinoOTA) and Nano (STK500v1 over TCP bridge).

## References

- [Firmware README](firmware/README.md)
- [Reverse Engineering Analysis](file:///Users/michaelsedbon/.gemini/antigravity/brain/fc55654d-b2f4-4236-bb5f-65c881349f02/reverse_engineering_analysis.md)
