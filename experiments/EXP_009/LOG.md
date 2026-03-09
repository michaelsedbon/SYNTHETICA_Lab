# EXP_009 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-09 — Experiment Created

- Initialised experiment folder from template.
- Goal: Use existing PCBs to control LEDs and elicit electrical spiking in *P. eryngii* mycelium.

## 2026-03-09 — PCB Identification from Photos

Analysed 4 photos in `Resources/` (IMG_0777–0780) to identify two PCBs:

### Board 1 — 8-Channel Driver Board
- **ESP32-S3-WROOM-1** (Espressif WiFi/BLE MCU), visible markings: `ESP32-S3-WROOM-1`, `MCN16R8`
- **NXP PCA9685PW** — 16-channel, 12-bit I2C PWM driver (TSSOP-28). Visible markings: `PCA9685PW`, `C3X956`, `TuD2507-`
- **8× TI DRV8870** — H-bridge motor/LED driver (HSOP-8). Visible markings: `8870`, `TI52M`, `ASD7`. Operating range 6.5–45V, 3.6A peak
- **8× 0.2Ω sense resistors** (R200) — current limiting on each DRV8870 ISEN pin
- **AMS1117-3.3** LDO (SOT-223) — 12V to 3.3V for logic
- **12V barrel jack** (5.5×2.1mm), **USB-C** connector, **BOOT** + **RES** tactile switches
- **8× 2-position screw terminals** labelled M1±…M8±
- Board date code: `250524`, number `0002`

### Board 2 — Circular LED Array
- ~70 SMD LEDs (U1–U76) arranged in radial spiral pattern on black PCB
- ~50 current-limiting resistors (R1–R54)
- Two solder pads labelled **12v+** and **GND**
- Board ID: `6423323A_Y55_240913`
- No active controller on board — purely passive, needs external 12V + GND switching

### Signal Flow (Board 1)
```
ESP32-S3 ─── I2C (SDA/SCL) ──→ PCA9685PW ─── 16× PWM ──→ 8× DRV8870 ─── OUT1/OUT2 ──→ M1–M8
     ↑                                                        ↑
   USB-C                                                   12V barrel jack
```

## 2026-03-09 — LED Control Feasibility Assessment

**Confirmed: the driver board can drive the LED array.**
- Voltage match: both 12V
- Current: LED array ≈ 1.4A total; each DRV8870 handles 3.6A peak
- Dimming: PCA9685 provides 12-bit (4096-step) PWM at up to 1.5 kHz
- Connection: wire LED array 12V+ to driver board 12V rail, LED GND to an M*− screw terminal
- DRV8870 min operating voltage is 6.5V, comfortably above LED forward-voltage drops at 12V supply

## 2026-03-09 — PCB Skill Pipeline Execution

Ran the full PCB skill pipeline (skipped literature scout since boards are already built):

### Step 1 — Component Analyst (`pcb-component-analyst`)
- Created `pcb/TIERED_DESIGNS.md`: functional block decomposition, signal flow, specs, pin counts for both boards
- Created `pcb/driver_board_prebom.csv`: 30+ line items including all ICs, passives, connectors, switches
- Created `pcb/led_array_prebom.csv`: LEDs, resistors, power pads

### Step 2 — Component Sourcer (`pcb-component-sourcer`)
- Sourced every component on LCSC for JLCPCB compatibility
- Key LCSC part numbers found:
  - ESP32-S3-WROOM-1: **C2913202** ($4.48, matches EXP_008)
  - PCA9685PW,118: **C150292** ($1.85, Extended)
  - DRV8870DDAR: **C86590** ($1.95 × 8 = $15.60, Extended)
  - AMS1117-3.3: **C6186** ($0.07, Basic)
- All passives use pre-validated JLCPCB Basic parts (C25744, C1525, C83061, etc.)
- Created `pcb/SOURCED_BOM.csv`: full BOM with LCSC#, footprints, pricing, JLCPCB status
- Created `pcb/SOURCING_REPORT.md`: sourcing decisions and cost breakdown
- **Estimated BOM: ~$23.43/board** (10 basic + 4 extended part types)

### Step 3 — Schematic Generator (`pcb-schematic-generator`)
- Created Atopile project at `pcb/atopile/` with 7 `.ato` module files:
  - `main.ato` — top-level board wiring all subsystems
  - `power.ato` — 12V barrel jack + AMS1117-3.3 LDO
  - `mcu.ato` — ESP32-S3 with I2C, USB, boot/reset buttons, decoupling
  - `pwm.ato` — PCA9685PW with all 28 pins mapped, I2C pull-ups, address config
  - `drivers.ato` — 8× DRV8870 `DriverChannel` modules with ISEN sense resistors and screw terminals
  - `connectors.ato` — USB-C with CC pull-downs for device mode
  - `led_array.ato` — passive LED array with current-limiting resistors
- Copied `generics/` library from EXP_008 for Atopile parametric part selection
- **`ato build` compiled successfully** — KiCad project generated in `pcb/atopile/build/default/`

### Step 4 — Documentation
- Updated `summary.md` with PCB identification, feasibility analysis, pipeline progress
- Updated `DOC_INDEX.md` with all new files
- Updated `SCRIPT_INDEX.md` with all Atopile source files
- Updated `LOG.md` (this file) with full chronological record

## 2026-03-09 — Firmware Development & WiFi Credentials Fix

- Built ESP32-S3 firmware with PlatformIO (Arduino framework)
- Features: WiFi STA + AP fallback, mDNS (`leddriver.local`), ArduinoOTA, REST API (8 channels + patterns), LittleFS web dashboard
- Initial WiFi password was wrong (`medicalex2024`), corrected to `94110Med+`
- Flashed firmware and LittleFS dashboard via USB
- Board connected to WiFi successfully at `172.16.1.126`
- Dashboard accessible at `http://leddriver.local`
- **Issue:** LEDs did not turn on when using dashboard controls

## 2026-03-09 — WiFi Debug Diagnostics

Serial output was unavailable (ESP32-S3 USB CDC issue), so we added WiFi-based debug endpoints:

- `GET /api/debug/i2c` — I2C bus scanner (scans all 127 addresses)
- `GET /api/debug/pca9685` — PCA9685 register dump (MODE1/2, PRESCALE, all 16 LED channels)
- `POST /api/debug/test` — Channel test with PCA9685 register readback
- `GET /api/debug/log` — WiFi log ring buffer (last 50 entries with timestamps)
- `GET /api/debug/scanpins` — GPIO pin brute-force scanner
- Added `wifiLog()` function replacing all `HWSerial.println()` calls
- Added collapsible 🔧 Debug panel to the web dashboard
- All deployed via OTA

### I2C Diagnosis

1. **I2C scan returned 0 devices** — PCA9685 not responding on assumed GPIO8 (SDA) / GPIO9 (SCL)
2. **GPIO pin scanner** brute-forced all 28 exposed ESP32-S3-WROOM-1 GPIOs
3. **Found PCA9685 at SDA=GPIO6, SCL=GPIO1** (136 attempts)
4. Secondary device at `0x70` = PCA9685 all-call address (normal)

### Fix & Verification

- Updated `I2C_SDA` from 8→6, `I2C_SCL` from 9→1 in `main.cpp`
- Redeployed via OTA
- **PCA9685 detected** at `0x40` ✅
- MODE1 = `0x20` (active, auto-increment ON), MODE2 = `0x04` (totem-pole)
- PRESCALE = 5 → 1017 Hz PWM
- **All 8 channels tested at max PWM**: `full_on=true`, readback match ✅
- **LEDs confirmed working** via dashboard controls

### Corrected Pin Mapping

| Function | GPIO | ESP32-S3 Pin |
|----------|------|-------------|
| I2C SDA | GPIO6 | — |
| I2C SCL | GPIO1 | — |
| USB D- | GPIO19 | pin 38 |
| USB D+ | GPIO20 | pin 39 |
| BOOT | GPIO0 | pin 4 |
| RESET/EN | EN | pin 3 |

