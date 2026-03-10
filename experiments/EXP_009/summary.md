# EXP_009: LED Stimulation of Mycelium via Existing PCBs

**Start Date:** 2026-03-09
**Status:** In progress
**Airtable Links:** None

---

## Overview

Use existing PCBs from the lab to control LEDs and deliver light stimulation to *P. eryngii* mycelium, with the goal of eliciting electrical spiking responses.

## Goal

Drive LEDs with available PCB hardware to optically stimulate mycelium and observe evoked action potentials, building on the light-response characterisation from EXP_006.

## PCB Identification

Two boards were identified from photos in `Resources/`:

### LED-DRV8 — 8-Channel Driver Board
- **MCU:** ESP32-S3-WROOM-1 (WiFi/BLE, USB-C)
- **PWM Controller:** NXP PCA9685PW — 16-ch, 12-bit, I2C
- **Drivers:** 8× TI DRV8870 H-bridge (6.5–45V, 3.6A peak)
- **Outputs:** 8× screw terminal pairs (M1–M8)
- **Power:** 12V barrel jack, AMS1117-3.3 LDO
- **I2C Pins:** SDA = GPIO6, SCL = GPIO1 *(discovered via GPIO pin scanner)*

### LED-RING — Circular LED Array
- ~70 SMD LEDs in radial spiral pattern
- Current-limiting resistors (R1–R54)
- 12V+/GND input pads
- Board ID: 6423323A_Y55_240913

## LED Control Feasibility

**The driver board can control the LED array. ✅ Verified working.**
Both boards are 12V-compatible. The DRV8870 handles the current draw easily (3.6A capacity vs ~1.4A LED load). PCA9685 provides smooth 12-bit PWM dimming at ~1017 Hz. Connection: wire LED GND to an M*− screw terminal.

## Firmware

**Source:** `firmware/src/main.cpp`
**Dashboard:** http://leddriver.local
**IP:** 172.16.1.126 (MEDICALEX network)
**OTA:** ArduinoOTA on port 3232

ESP32-S3 firmware with:
- WiFi STA mode (MEDICALEX network) + AP fallback
- mDNS hostname: `leddriver.local`
- ArduinoOTA for wireless firmware updates
- REST API for 8-channel PWM control
- 4 built-in patterns: pulse, blink, fade, sweep
- Web dashboard served from LittleFS (JSON protocol import with portable UUID generator)
- WiFi debug diagnostics (I2C scanner, PCA9685 register dump, GPIO pin scanner, log buffer)
- **PCA9685 init retry** — 3 attempts with exponential backoff on boot
- **`/api/reinit`** endpoint — re-initialize PCA9685 on demand without reboot
- **Heartbeat broadcasting** — periodic UDP beacon for auto-discovery by ADC-24 backend

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Channel states, pattern, WiFi info |
| POST | `/api/channel` | Set single channel PWM (0–4095) |
| POST | `/api/all` | Set all channels |
| POST | `/api/master` | Set master brightness (0–100%) |
| POST | `/api/pattern` | Start pattern (pulse/blink/fade/sweep) |
| POST | `/api/stop` | Stop pattern, all channels off |

### Debug Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/debug/i2c` | I2C bus scanner |
| GET | `/api/debug/pca9685` | PCA9685 register dump |
| POST | `/api/debug/test` | Channel test + register readback |
| GET | `/api/debug/log` | WiFi log buffer (last 50 entries) |
| GET | `/api/debug/scanpins` | GPIO pin brute-force scanner |

### How to Flash (OTA)

```bash
cd experiments/EXP_009/firmware
pio run -e ota -t upload      # Flash firmware
pio run -e ota -t uploadfs    # Flash dashboard (LittleFS)
```

## Pipeline Progress

- [x] Step 1: Component analysis (TIERED_DESIGNS.md + pre-BOMs)
- [x] Step 2: LCSC sourcing (SOURCED_BOM.csv + SOURCING_REPORT.md)
- [x] Step 3: Atopile schematic generation (ato build ✓)
- [x] Step 4: Firmware development (pio run ✓, USB flash ✓)
- [x] Step 5: Web dashboard (LittleFS upload ✓)
- [x] Step 6: WiFi debug diagnostics + I2C pin fix (GPIO6/1)
- [x] Step 7: LED control verified working ✓
- [x] Step 8: Wire boards together for mycelium stimulation ✓ (via EXP_010)
- [x] Step 9: Integrate with mycelium recording setup ✓ (ADC-24 dashboard controls LED-DRV8 via HTTP, see EXP_010)

## References

- EXP_006 — Fungal Electrophysiology Literature Review (blue/UV light-evoked responses)
- EXP_001 — Growing *P. eryngii* and electrophysiology recording setup
- Mishra et al. 2024 — Blue/UV light-evoked spiking in *P. eryngii*
