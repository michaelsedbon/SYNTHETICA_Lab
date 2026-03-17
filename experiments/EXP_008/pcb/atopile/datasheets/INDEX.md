# Component Datasheets — Index

All datasheets for the MyceliumBoard (EXP_008) PCB. If you have questions about a component, the agent can re-read the relevant datasheet PDF from this folder.

---

## ICs

### ADS1299 — 8-Channel 24-Bit ADC for Biopotential Measurements
- **File:** [ADS1299_TI.pdf](./ADS1299_TI.pdf)
- **Manufacturer:** Texas Instruments | **LCSC:** C476817 | **Des.:** U11
- **Key specs:** 24-bit delta-sigma, 250/500/1k/2k/4k/8k/16k SPS, 8 differential inputs, SPI interface, internal reference, integrated bias drive, SRB pins for common reference
- **Vdd:** AVDD 4.75–5.25V, DVDD 1.8–3.6V
- **Critical notes:** CLKSEL pin selects internal/external clock. nPWDN, nRESET, nCS, nDRDY are active-low. Needs external 8.192MHz crystal for 2kSPS operation. Decoupling: 100nF + 1µF on every supply pin.

### DAC8564 — Quad 16-Bit Voltage-Output DAC
- **File:** [DAC8564IAPWR_C2680186.pdf](./DAC8564IAPWR_C2680186.pdf)
- **Manufacturer:** Texas Instruments | **LCSC:** C2680186 | **Des.:** U23
- **Key specs:** 16-bit, 4 channels (VOUTA-D), internal 2.5V reference, SPI interface (SCLK, DIN, nSYNC), low glitch
- **Vdd:** AVDD 2.7–5.5V
- **Critical notes:** nSYNC = chip select (active-low). LDAC controls update timing. nENABLE enables outputs. A0/A1 set SPI address for daisy-chaining.

### OPA4188 — Quad Zero-Drift Precision Op-Amp
- **File:** [OPA4188_TI.pdf](./OPA4188_TI.pdf)
- **Manufacturer:** Texas Instruments | **LCSC:** C118204 | **Des.:** U26
- **Key specs:** Zero-drift (max 25µV offset), rail-to-rail output, 2MHz GBW, 0.8V/µs slew rate, quad package
- **Vdd:** ±2.25V to ±18V (single 4.5–36V)
- **Critical notes:** Used in Howland current pump configuration. VSpos = V+, VSneg = V−. Ultra-low offset is critical for accurate µA-level stimulation current.

### TPS65131 — Bipolar ±5V DC-DC Converter
- **File:** [TPS65131_TI.pdf](./TPS65131_TI.pdf)
- **Manufacturer:** Texas Instruments | **LCSC:** C87663 | **Des.:** U7
- **Key specs:** Dual output: positive boost + negative inverting, 96% efficiency, 800mA positive / 200mA negative
- **Vdd:** Input 2.7–5.5V
- **Critical notes:** ENP/ENN enable positive/negative rails independently. FBP/FBN are feedback pins (NOT direct output — need external feedback resistors). BSW is boost switch pin. AGND is analog ground. EP = exposed pad (must be soldered to GND).

### TLV75733 — Low-Noise 3.3V LDO (Analog Supply)
- **File:** [TLV757_TI.pdf](./TLV757_TI.pdf)
- **Manufacturer:** Texas Instruments | **LCSC:** C485517 | **Des.:** U4
- **Key specs:** Fixed 3.3V output, 500mA max, ultra-low noise (5.8µVrms), PSRR 66dB at 1kHz
- **Vdd:** Input 1.5–5.5V
- **Critical notes:** EN pin enables output. Low noise makes it suitable for analog supply powering ADS1299. Output capacitor: ≥1µF ceramic.

### AMS1117-3.3 — 3.3V LDO (Digital Supply)
- **File:** [AMS1117.pdf](./AMS1117.pdf)
- **Manufacturer:** Advanced Monolithic Systems | **LCSC:** C6186 | **Des.:** U1
- **Key specs:** Fixed 3.3V output, 1A max, SOT-223 package, dropout 1.1V typical
- **Vdd:** Input 4.4–15V
- **Critical notes:** Requires 22µF output capacitor (ESR important for stability). GND=pin1, VOUT=pin2, VIN=pin3.

### PRTR5V0U2X — Dual ESD Protection
- **File:** [PRTR5V0U2X.pdf](./PRTR5V0U2X.pdf)
- **Manufacturer:** Nexperia | **LCSC:** C12333 | **Des.:** U19–U22
- **Key specs:** ESD TVS for 2 I/O lines, ±8kV contact discharge, SOT-143 package
- **Vdd:** VCC 0–5.5V
- **Critical notes:** GND=pin1, IO1=pin2, IO2=pin3, VCC=pin4. Ultra-low capacitance (0.55pF) — suitable for high-impedance electrode inputs.

### Crystal H1OSC-SUG-8.192MHz
- **File:** [Crystal_H1OSC-SUG-8.192M_C20617535.pdf](./Crystal_H1OSC-SUG-8.192M_C20617535.pdf)
- **Manufacturer:** YXC | **LCSC:** C20617535 | **Des.:** U13
- **Key specs:** 8.192MHz, HC-49S package, 20pF load capacitance, ±20ppm stability
- **Critical notes:** OSC1/OSC2 pins connect to ADS1299 CLK. Load caps: 22pF each to GND. Keep traces short, no routing under crystal.

### ESP32-S3-WROOM-1-N16R8 — WiFi+BLE MCU Module
- **File:** ⚠️ Not downloaded (Espressif blocks automated downloads)
- **Online:** [Espressif Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)
- **Manufacturer:** Espressif | **LCSC:** C2913202 | **Des.:** U41
- **Key specs:** Dual-core Xtensa LX7 @ 240MHz, 16MB flash, 8MB PSRAM, WiFi 802.11 b/g/n, BLE 5.0, USB OTG
- **Vdd:** 3.0–3.6V (typ 3.3V)
- **Critical notes:** IO19/IO20 = USB D−/D+. EN pin needs 10kΩ pull-up + 1µF cap to GND. GND pins: 1, 40, 41.

---

## Passives (no individual datasheets — generic parts)

| Des. | Value | LCSC | Type | Notes |
|---|---|---|---|---|
| U12, U29, etc. | 10kΩ | C25744 | R0402 1% | Pull-ups, Howland pump Rf/Ri |
| U31, U34, etc. | 1kΩ | C106235 | R0402 1% | Howland pump Rs, LED limiting |
| U54, U55 | 5.1kΩ | C105873 | R0402 5% | USB-C CC pulldowns |
| U16, U18, etc. | 100nF | C1525 | C0402 | Decoupling |
| U17, U43 | 1µF | C15849 | C0402 | Decoupling, EN filter |
| U5, U6 | 4.7µF | C19666 | C0603 | LDO decoupling |
| U2, U3, etc. | 10µF | C83061 | C0805 | Bulk decoupling |
| U14, U15 | 22pF | C1555 | C0402 | Crystal load caps |
| U46 | LED Green | C72043 | 0603 | Power indicator |
| U48 | LED Blue | C72041 | 0603 | Activity (IO8) |

---

*Last updated: 2026-03-14*
