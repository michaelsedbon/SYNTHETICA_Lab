# ESP32 Motor Controller — Research Report

Research for a single-board ESP32 replacement for the dual-chip ESP8266+Nano motor controller (EXP_005/EXP_011).

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  USB-C ──► CH340C ──► ESP32-WROOM-32                            │
│              │           │                                       │
│              └──► Auto-reset (DTR/RTS + 2× NPN)                 │
│                    (auto-enters bootloader on flash — no manual  │
│                     BOOT+RESET button dance needed)              │
│                                                                  │
│  24V IN ──► XL1509 (→5V) ──► AMS1117-3.3 (→3.3V) ──► ESP32     │
│                     │                                            │
│  ESP32 GPIO16 ──► NPN level shift (→5V) ──► STEP ──┐            │
│  ESP32 GPIO17 ──► NPN level shift (→5V) ──► DIR  ──┤──► DM542T  │
│                                              GND ──┘            │
│                                                                  │
│  ESP32 GPIO34 ◄── 1kΩ ◄── Screw Terminal ◄── NPN Sensor (24V)  │
│                    └── 3.3V Zener (fault protection)             │
│                                                                  │
│  ESP32 GPIO21 (SDA) ──┐──► SSD1306 0.96" OLED (128×64)          │
│  ESP32 GPIO22 (SCL) ──┘                                         │
│                                                                  │
│  LEDs:  [PWR] 3.3V hardwired (green)                             │
│         [WIFI] GPIO23 (blue)                                     │
│         [MOTOR] GPIO25 (yellow)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ESP32 GPIO Pin Selection

### Strapping Pins to AVOID for Motor/Sensor

| Pin | Boot Function | Risk |
|-----|--------------|------|
| GPIO0 | Must be HIGH for normal boot | External pull would prevent flashing |
| GPIO2 | Must be LOW/floating at boot | Output could affect boot |
| GPIO5 | Must be HIGH at boot | Goes HIGH briefly at boot anyway |
| GPIO12 | Sets flash voltage (must be LOW) | **Critical** — never use externally |
| GPIO15 | Must be HIGH at boot | Outputs debug signal at boot |

### Pins NOT Available

| Pin | Reason |
|-----|--------|
| GPIO6–11 | Connected to internal SPI flash |
| GPIO1, GPIO3 | UART0 TX/RX (used for USB serial) |
| GPIO34–39 | **Input-only** (fine for sensor, not for motor) |

### Recommended Pin Assignment

| Function | GPIO | Rationale |
|----------|------|-----------|
| **STEP** (PUL+) | **GPIO16** | Safe output, no boot function, no conflict |
| **DIR** (DIR+) | **GPIO17** | Safe output, adjacent to GPIO16 |
| **Sensor** input | **GPIO34** | Input-only pin — perfect for sensor, saves a bidirectional GPIO |
| **OLED SDA** | **GPIO21** | Default I2C SDA on ESP32 |
| **OLED SCL** | **GPIO22** | Default I2C SCL on ESP32 |
| **LED WiFi** | **GPIO23** | Safe output, WiFi status indicator |
| **LED Motor** | **GPIO25** | Safe output, motor activity indicator |

> **Note:** GPIO16/17 are also UART2 TX/RX on ESP32, but we won't use UART2 so no conflict. These pins have no boot-time side effects.

---

## 3. DM542T Interface

The DM542T has optically isolated inputs (PUL+, DIR+, ENA+, and shared GND). Key specs from the datasheet:

- **Logic signal current:** 7–16 mA (typical 10 mA)
- **Logic voltage:** 5V–24V (labelled on driver, 3.3V is NOT sufficient)
- **Level shifter required** — ESP32 outputs 3.3V, DM542T needs ≥5V

### Level Shifting: NPN Transistor (3.3V → 5V)

Simplest and cheapest approach — one NPN transistor per channel, using the 5V rail from the MP1584:

```
                        5V (from XL1509)
                         │
                        [1kΩ pull-up]
                         │
ESP32 GPIO ──[1kΩ]──► Base ──► NPN (S8050)
                              │
                          Collector ──────► DM542T PUL+ or DIR+
                          Emitter ──► GND

DM542T PUL- / DIR- ──────────────► GND
```

**Logic:** ESP32 HIGH → NPN saturates → collector goes LOW → DM542T sees 0V.
ESP32 LOW → NPN off → collector pulled to 5V → DM542T sees 5V.

> **Note:** This inverts the signal. AccelStepper handles this fine — just swap the `HIGH`/`LOW` logic in firmware, or use `stepper.setPinsInverted(true, false)` in AccelStepper.

### Confirmed Working Parameters (from EXP_011, to port to ESP32)

- AccelStepper::DRIVER mode
- `setMaxSpeed(2000)` — 2000 steps/sec
- `setAcceleration(1000)`
- `setMinPulseWidth(20)` — 20 µs minimum pulse
- Raw GPIO test: 500 µs HIGH / 500 µs LOW works reliably
- **New for ESP32:** Add `stepper.setPinsInverted(true, false)` to account for NPN inversion

---

## 4. Power Supply Design

### Why Two-Stage Regulation

24V → 3.3V in a single LDO would dissipate **(24 - 3.3) × 0.25A = 5.2W** — far too much heat. A two-stage approach is standard:

1. **Stage 1: XL1509-5.0E1 buck converter** — 24V → 5V (switching, ~85% efficiency)
2. **Stage 2: AMS1117-3.3 LDO** — 5V → 3.3V (linear, 1.7V dropout × 0.25A = 0.4W — manageable)

### XL1509-5.0E1 Details

- Input: 4.5V–40V ✅ (24V well within range, extra margin)
- Output: **fixed 5.0V** (no feedback resistors needed — simpler design)
- Max current: 2A (we need ~85 mA — massive headroom)
- Package: SOP-8 (hand-solderable, JLCPCB assemblable)
- **JLCPCB status:** ✅ Basic part (no extra assembly fee)
- Requires: inductor (100µH), Schottky diode (SS34), input cap (100µF electrolytic), output cap (220µF electrolytic)

### AMS1117-3.3 Details

- Input: 5V (from MP1584 output)
- Output: 3.3V fixed
- Max current: 1A
- Package: SOT-223
- **JLCPCB status:** Basic part ✅
- Requires: 10µF input cap, 22µF output cap

### Power Budget

| Consumer | Current (typ) | Current (max) |
|----------|--------------|---------------|
| ESP32-WROOM-32 (WiFi active) | 80 mA | 240 mA |
| CH340C USB-serial | 10 mA | 30 mA |
| DM542T opto inputs (2 channels) | 20 mA | 32 mA |
| Sensor pull-up | 10 mA | 15 mA |
| Status LEDs (3×, 5 mA each) | 15 mA | 15 mA |
| OLED display | 20 mA | 30 mA |
| **Total 3.3V rail** | **~155 mA** | **~362 mA** |

AMS1117-3.3 (1A max) has good margin. XL1509 at 5V output needs ~360 mA × 5V/24V × 1/0.85 ≈ 90 mA from 24V — trivial.

---

## 5. USB-C & Programming Circuit

### Why a USB-to-Serial Chip is Needed

The ESP32-WROOM-32 module has **no built-in USB** — only UART pins (TX0/RX0). To program or debug via USB-C, we need an external USB-to-serial converter chip. This is exactly what every ESP32 dev board (DevKitC, NodeMCU-32S) has onboard. We're just putting the same chip on our custom PCB.

> **Note:** The ESP32-**S3** has native USB, but we're using the original ESP32 which doesn't.

### CH340C USB-to-Serial

- Integrated oscillator (no external crystal needed, unlike CH340G)
- Package: SOP-16
- **JLCPCB status:** Basic/Extended (varies by variant)
- 3.3V I/O compatible

### USB-C Connector

- For USB 2.0 only (programming/debug), need:
  - VBUS, D+, D-, GND
  - CC1 and CC2 each pulled down with **5.1kΩ** to GND (identifies as UFP/sink)
- No USB-PD negotiation needed

### Auto-Reset Circuit (ESP32 DevKitC reference)

Standard Espressif design using 2× NPN transistors:

```
CH340C DTR ──[10kΩ]──► Base of Q1 (NPN)
                        Collector ──► ESP32 GPIO0
                        Emitter ──► CH340C RTS

CH340C RTS ──[10kΩ]──► Base of Q2 (NPN)
                        Collector ──► ESP32 EN
                        Emitter ──► CH340C DTR
```

Plus EN pin needs: 10kΩ pull-up to 3.3V + 1µF cap to GND.

---

## 6. Sensor Input

### LJ8A3-2-Z/BX NPN NO Proximity Sensor

- Type: NPN Normally Open (sinks current when target detected)
- Supply: 6–36V DC (powered from 24V rail directly)
- Output: Open-collector NPN — pulls signal LOW when active
- **Pull-up required:** On the ESP32 side, 10kΩ to 3.3V on GPIO34

### Circuit

```
24V ──► Sensor VCC (brown wire)
GND ──► Sensor GND (blue wire)
Sensor OUT (black wire) ──[1kΩ]──► GPIO34 ◄── 10kΩ ──► 3.3V
                                      │
                                   [3.3V Zener] ──► GND

When no target: GPIO34 reads HIGH (pulled up)
When target detected: Sensor sinks, GPIO34 reads LOW
```

> **Voltage protection:** Under normal operation the sensor only pulls low (safe). But if the sensor **fails internally** (shorts between its 24V supply and output), 24V would appear on GPIO34 and destroy the ESP32. The 3.3V Zener clamps the voltage, and the 1kΩ series resistor limits fault current. Cost: ~$0.02 total for insurance against a $5+ ESP32 dying.

---

## 6b. OLED Display

### SSD1306 0.96" OLED (128×64, I2C)

- Interface: I2C (2 wires: SDA, SCL)
- Voltage: 3.3V
- I2C address: 0x3C (default)
- Pins: GPIO21 (SDA), GPIO22 (SCL)
- **Use case:** Display motor position, speed, WiFi IP/status, sensor state

### Connection

```
ESP32 GPIO21 (SDA) ──[4.7kΩ pull-up to 3.3V]──► OLED SDA
ESP32 GPIO22 (SCL) ──[4.7kΩ pull-up to 3.3V]──► OLED SCL
3.3V ──► OLED VCC
GND  ──► OLED GND
```

> **Connector:** A 4-pin header (GND, VCC, SDA, SCL) so the OLED can be mounted off-board on a panel or enclosure lid.

---

## 6c. Status & Debug LEDs

Three LEDs give at-a-glance board status without needing serial or OLED:

| LED | Color | GPIO | Behaviour |
|-----|-------|------|-----------|
| **PWR** | Green | — (hardwired to 3.3V) | Always on when board is powered |
| **WIFI** | Blue | GPIO23 | Blinks during WiFi connect, solid when connected |
| **MOTOR** | Yellow | GPIO25 | Toggles on each step pulse (flickers during motion) |

### Circuit (each GPIO-driven LED)

```
GPIO ──[330Ω]──► LED anode ──► LED cathode ──► GND

I = (3.3V - Vf) / 330Ω ≈ 5 mA (Vf ≈ 1.8–3.0V depending on color)
```

The PWR LED connects directly to the 3.3V rail through a 330Ω resistor (no GPIO needed).

---

## 7. Component Summary

| Component | Part | Package | Qty | Role |
|-----------|------|---------|-----|------|
| ESP32-WROOM-32 | ESP32-WROOM-32 | Module (castellated) | 1 | Main MCU + WiFi |
| Buck converter | XL1509-5.0E1 | SOP-8 | 1 | 24V → 5V (JLCPCB basic ✅) |
| LDO regulator | AMS1117-3.3 | SOT-223 | 1 | 5V → 3.3V (JLCPCB basic ✅) |
| USB-serial | CH340C | SOP-16 | 1 | USB-to-UART for programming |
| USB-C connector | Standard 16-pin | SMD | 1 | Programming/debug |
| NPN transistors | S8050 | SOT-23 | **4** | 2× auto-reset + 2× motor level shift |
| Schottky diode | SS34 | SMA | 1 | Buck converter freewheeling |
| Inductor | 100µH | 8×8mm | 1 | Buck converter (XL1509) |
| Electrolytic caps | 100µF, 220µF | 6.3×7mm | 2 | XL1509 input/output filtering |
| ESD protection | USBLC6-2SC6 | SOT-23-6 | 1 | USB data line protection |
| Zener diode | 3.3V | SOD-323 | 1 | Sensor GPIO protection |
| Caps (ceramic) | 22µF, 10µF, 100nF | 0805/0603 | ~8 | Decoupling/filtering |
| Resistors | Various | 0603 | ~17 | Pull-ups, level shift, feedback, I2C, LED current limit |
| Screw terminals | 2-pos, 5.08mm pitch | Through-hole | 3 | 24V in, Motor out, Sensor |
| OLED header | 4-pin 2.54mm | Through-hole | 1 | SSD1306 OLED connector |
| LED (green) | 0603 | SMD | 1 | PWR indicator (hardwired) |
| LED (blue) | 0603 | SMD | 1 | WiFi status (GPIO23) |
| LED (yellow) | 0603 | SMD | 1 | Motor activity (GPIO25) |
| BOOT button | 6mm tactile | Through-hole | 1 | Manual GPIO0 pull-low |
| RESET button | 6mm tactile | Through-hole | 1 | Manual EN reset |

---

## 8. Reference Designs Consulted

| Source | Key Takeaway |
|--------|-------------|
| ESP32-DevKitC-V4 schematic (Espressif) | Auto-reset circuit, EN/GPIO0 strapping, USB-serial reference |
| MP1584EN datasheet (MPS) | Application circuit for 24V→5V, layout guidelines |
| DM542T datasheet (Leadshine) | Opto-isolated input specs, 3.3V compatibility confirmed |
| EXP_011 firmware (step_05_accelstepper) | Confirmed AccelStepper config, working pulse timing |
| EXP_008 PCB design artifacts | Atopile workflow reference, JLCPCB lessons learned |

---

## 9. Architecture Decisions

### Why ESP32-WROOM-32 Module (not bare chip)
- Module includes antenna, crystal, flash — massively simplifies PCB design
- JLCPCB can solder the module (castellated pads)
- No RF layout expertise needed

### Why XL1509-5.0E1 (not MP1584EN)
- XL1509-5.0E1 is a **JLCPCB basic part** — no extra assembly fee
- Fixed 5V output — no feedback resistor divider to design
- 4.5V–40V input range gives more margin than MP1584 (28V max)
- 2A max current is more than enough for our ~90 mA draw

### Why Two-Stage Power (not single buck to 3.3V)
- XL1509 to 3.3V directly would work but the 5V intermediate rail is useful for:
  - USB VBUS reference
  - Potential future 5V peripherals
- AMS1117 LDO at 5V→3.3V is extremely low risk and cheap

### Why NPN Level Shifters for DM542T (not direct 3.3V)
- DM542T label specifies 5V–24V input — 3.3V is below minimum
- NPN open-collector with 5V pull-up is the simplest/cheapest level shift
- Only 2 extra SOT-23 transistors + 4 resistors
- Signal inversion handled in firmware with `setPinsInverted()`

### Why CH340C (not CP2102 or no USB chip)
- ESP32-WROOM-32 has **no built-in USB** — needs an external USB-to-serial chip for programming
- CH340C is cheaper than CP2102 and widely available on LCSC
- No external crystal needed (unlike CH340G)
- Well-proven on ESP32 dev boards

### Why SSD1306 OLED (not LCD)
- I2C = only 2 wires (vs 4+ for SPI LCD)
- 3.3V native (no level shifting)
- 128×64 is enough for status info
- Off-board via 4-pin header — mount wherever convenient

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 24V spike on sensor fault damages GPIO34 | 3.3V Zener clamp + 1kΩ series resistor on sensor input |
| WiFi antenna blocked by ground plane | Keep antenna area clear of copper (Espressif guideline) |
| Boot-time GPIO glitch causes unintended motor pulse | GPIO16/17 have no boot-time side effects; DM542T ENA can be used as extra safety |
| NPN level shift inverts STEP/DIR signals | AccelStepper `setPinsInverted(true, false)` handles this in firmware |
