# EXP_009 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Firmware (firmware/)

| File | Type | Description |
|------|------|-------------|
| `platformio.ini` | Config | ESP32-S3 PlatformIO project (USB + OTA environments) |
| `src/main.cpp` | Firmware | WiFi, OTA, PCA9685 I2C PWM, REST API, 4 patterns |
| `data/index.html` | Dashboard | Dark-mode web UI — 8 sliders, master, patterns, WiFi status |

## PCB Documentation (pcb/)

| File | Type | Description |
|------|------|-------------|
| `TIERED_DESIGNS.md` | Documentation | Functional block decomposition, signal flow, specs |
| `driver_board_prebom.csv` | BOM | Pre-BOM for LED-DRV8 (8-channel driver board) |
| `led_array_prebom.csv` | BOM | Pre-BOM for LED-RING (circular LED array) |
| `SOURCED_BOM.csv` | BOM | Final BOM with LCSC part numbers, footprints, pricing |
| `SOURCING_REPORT.md` | Documentation | LCSC sourcing decisions, cost breakdown (~$23/board) |

## Atopile Schematic Files (pcb/atopile/elec/src/)

| File | Module | Description |
|------|--------|-------------|
| `main.ato` | `DriverBoard` | Top-level board wiring |
| `power.ato` | `PowerSupply` | 12V barrel jack → AMS1117-3.3 LDO |
| `mcu.ato` | `MCU_Module` | ESP32-S3 with I2C, USB, boot/reset |
| `pwm.ato` | `PWM_Controller` | PCA9685PW 16-ch I2C PWM |
| `drivers.ato` | `Drivers` | 8× DRV8870 with ISEN + screw terminals |
| `connectors.ato` | `USB_Connector` | USB-C with CC pull-downs |
| `led_array.ato` | `LED_Array` | Passive circular LED board |

## Resource Images (Resources/)

| File | Description |
|------|-------------|
| `IMG_0777.jpg` | LED-DRV8 — full board overview |
| `IMG_0778.jpg` | LED-DRV8 — close-up PCA9685PW + DRV8870 drivers |
| `IMG_0779.jpg` | LED-DRV8 — close-up barrel jack + screw terminals |
| `IMG_0780.jpg` | LED-RING — circular LED array board |
