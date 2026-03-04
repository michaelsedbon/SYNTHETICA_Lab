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
- Uses a unique pin mapping (D4=Step, D2=Dir).

## Goal

Successfully configure, flash, and verify two additional motor control boards (Board 3 and Board 4) using the modern EXP_002 firmware adapted for this specific hardware layout.

## Progress

- Reverse engineered board from photos and old code.
- Identified pin mapping: **D4 (Step)**, **D2 (Dir)**, **D3 (Sensor)**, **D5 (Nano Reset)**.
- Established dedicated EXP_005 workspace to avoid conflicts with EXP_002 production hardware.

## Results

_No results yet._

## References

- [Reverse Engineering Analysis](file:///Users/michaelsedbon/.gemini/antigravity/brain/fc55654d-b2f4-4236-bb5f-65c881349f02/reverse_engineering_analysis.md)
- [Implementation Plan](file:///Users/michaelsedbon/.gemini/antigravity/brain/fc55654d-b2f4-4236-bb5f-65c881349f02/implementation_plan.md)
