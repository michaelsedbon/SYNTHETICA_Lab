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

_Starting fresh — see TODO.md for step-by-step plan._

## Results

_No results yet._

## References

- [EXP_005 Summary](../EXP_005/summary.md)
- [Implementation Plan](implementation_plan.md)
- [TODO — Cross-Agent Handoff](TODO.md)
