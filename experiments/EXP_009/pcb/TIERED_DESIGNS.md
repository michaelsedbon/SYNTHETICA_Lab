# Existing PCB Documentation — EXP_009

Documentation of two existing PCBs identified from lab photos. Single tier per board (as-built).

## Functional Block Diagram

### Board 1 — 8-Channel Driver Board

```
12V Barrel Jack ──┬── 3.3V LDO ── ESP32-S3-WROOM-1
                  │                     │ I2C (SDA/SCL)
                  │                     ▼
                  │              PCA9685PW (16-ch PWM)
                  │                │  │  │  │  │  │  │  │
                  │               PWM pairs (IN1/IN2 × 8)
                  │                │  │  │  │  │  │  │  │
                  ├── 12V ──── DRV8870 ×8 (H-bridge drivers)
                  │               │R_ISEN│  │  │  │  │  │
                  │              0.2Ω sense resistors ×8
                  │                │  │  │  │  │  │  │  │
                  │              M1± M2± M3± M4± M5± M6± M7± M8±
                  │              (screw terminal outputs)
USB-C ── ESP32-S3 (programming / serial)
```

### Board 2 — Circular LED Array

```
12V+ ── R_limit (×~50) ── LED (×~70, radial spiral layout) ── GND
         (current-limiting)     (SMD, U1–U76)
```

---

## Block Specifications

### Board 1 — Driver Board

#### MCU — ESP32-S3-WROOM-1
- **Purpose:** System controller, WiFi/BLE connectivity, USB serial
- **Key specs:** Dual-core 240 MHz, 4 MB flash, WiFi 802.11 b/g/n, BLE 5.0
- **Interface:** I2C to PCA9685, USB-C for programming
- **Power:** 3.3V from LDO
- **Pin count:** 41

#### PWM Controller — PCA9685PW
- **Purpose:** Generate 16 independent 12-bit PWM signals via I2C
- **Key specs:** 16 channels, 12-bit resolution (4096 steps), 24 Hz – 1526 Hz frequency, I2C Fm+ (up to 1 MHz)
- **Interface:** I2C (SDA/SCL) from ESP32, 16 PWM outputs to DRV8870 pairs
- **Power:** 3.3V (logic) + separate V+ for LED/motor supply (up to 5.5V)
- **Pin count:** 28 (TSSOP-28)
- **Address:** Configurable via A0–A5 pins (6-bit, up to 62 devices on one bus)

#### H-Bridge Driver — DRV8870 (×8)
- **Purpose:** Bidirectional power driver for motors/LEDs on each channel
- **Key specs:** 6.5–45V operating, 3.6A peak / 0.565A RMS, integrated protection (UVLO, OCP, TSD)
- **Interface:** 2 logic inputs (IN1, IN2) from PCA9685, 2 motor outputs (OUT1, OUT2) to screw terminals
- **Power:** 12V from barrel jack
- **Pin count:** 8 (HSOP-8 with PowerPAD)
- **Current limiting:** Via ISEN pin + 0.2Ω sense resistor (I_limit ≈ VREF/5/R_ISEN)

#### Current Sense Resistors — 0.2Ω (×8)
- **Purpose:** Set DRV8870 current limit via ISEN pin
- **Key specs:** 0.2Ω, low-inductance, ≥0.5W
- **Package:** Likely 0805 or 1206

#### Power Supply — 12V + 3.3V LDO
- **Purpose:** 12V barrel jack input, 3.3V LDO for ESP32 + PCA9685 logic
- **Key specs:** 12V input, 3.3V regulated output
- **Components:** Barrel jack connector, LDO (likely AMS1117-3.3 or similar based on SOT-223 visible), decoupling caps

#### Connectors
- **USB-C:** Programming / serial communication
- **Barrel jack:** 12V DC input
- **Screw terminals (×8):** 2-position, M1± through M8±
- **Buttons:** BOOT + RES (ESP32 boot mode / reset)

---

### Board 2 — LED Array

#### LEDs — SMD (×~70)
- **Purpose:** Light emission (likely white or specific color for stimulation)
- **Key specs:** ~70 LEDs in radial spiral pattern, driven at 12V via current-limiting resistors
- **Package:** Likely 2835 or 3528 SMD
- **Designators:** U1–U76 (some positions may be unpopulated)

#### Current Limiting Resistors (×~50)
- **Purpose:** Set LED forward current
- **Key specs:** Value TBD from actual measurement; one resistor per 1–2 LEDs
- **Designators:** R1–R54

#### Power Input
- **Purpose:** 2-wire (12V+ / GND) pad for external power
- **Interface:** Solder pads or screw terminals

---

## Tier Summary

Since these are existing boards (not new designs), there is one tier per board:

| Feature | Board 1: Driver | Board 2: LED Array |
|---------|----------------|--------------------|
| Function | 8-ch PWM motor/LED driver | Passive LED array |
| Controller | ESP32-S3 + PCA9685 | None (needs external driver) |
| Output channels | 8 bidirectional | 1 (all LEDs parallel) |
| Supply voltage | 12V | 12V |
| Max current/ch | 3.6A peak | ~1.4A total |
| PCB layers | 2 (estimated) | 1–2 |
| Assembly | SMD, some fine-pitch (PCA9685 TSSOP-28) | SMD LEDs + resistors |
| Estimated BOM | ~$15–20 | ~$5–8 |

## Recommendation

These two boards form a complete LED stimulation system when wired together. The driver board (Board 1) controls individual channels that can power sections or the entirety of the LED array (Board 2), with 12-bit PWM dimming via I2C from the ESP32-S3.
