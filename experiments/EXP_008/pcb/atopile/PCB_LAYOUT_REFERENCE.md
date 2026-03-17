# MyceliumBoard — PCB Layout Reference

Quick-reference for KiCad PCB layout. Use alongside the PCB editor.

> **Atopile v0.14 Build (2026-03-16)** — All designators updated to match the actual KiCad build output. Components use proper prefix conventions (U, R, C, D, LED, etc.).

---

## Board Architecture

```
┌─────────────────────────────────────────┐
│  🟢 ANALOG ZONE        │  🔵 DIGITAL   │
│  U5 (ADS1299)           │  U1 (ESP32)   │
│  D1-D8 (ESD ×8)         │  LED1, LED2   │
│  X1 (Crystal)           │  H1 (Debug)   │
│  P1, P2 (Electrodes)   │               │
├─────────────────────────┤               │
│  🟡 STIM ZONE           │               │
│  U6 (DAC8564)           │               │
│  U7 (OPA4188)           │               │
│  H2 (Stim header)      │               │
├─────────────────────────┴───────────────┤
│  🔴 POWER ZONE                          │
│  U4 (3.3V LDO dig)  U3 (3.3V LDO ana) │
│  U2 (±5V DC-DC)     USB1 (USB-C)      │
└─────────────────────────────────────────┘
```

---

## ICs — Datasheets & Designators

| Des. | Component | LCSC | Package | Datasheet |
|---|---|---|---|---|
| **U5** | ADS1299IPAGR | C476817 | TQFP-64 | [📄 Datasheet](https://www.lcsc.com/datasheet/lcsc_datasheet_2410121943_Texas-Instruments-ADS1299IPAGR_C476817.pdf) |
| **U1** | ESP32-S3-WROOM-1-N16R8 | C2913202 | WiFi module | [📄 Datasheet](https://www.lcsc.com/datasheet/lcsc_datasheet_2411121101_Espressif-Systems-ESP32-S3-WROOM-1-N16R8_C2913202.pdf) |
| **U6** | DAC8564IAPWR | C2680186 | TSSOP-16 | [📄 Datasheet](https://wmsc.lcsc.com/wmsc/upload/file/pdf/v2/lcsc/2303011100_Texas-Instruments-DAC8564IAPWR_C2680186.pdf) |
| **U7** | OPA4188AIPWR | C118204 | TSSOP-14 | [📄 Datasheet](https://www.lcsc.com/datasheet/lcsc_datasheet_1809051327_Texas-Instruments-OPA4188AIPWR_C118204.pdf) |
| **U2** | TPS65131RGER | C87663 | QFN-24 | [📄 Datasheet](https://www.lcsc.com/datasheet/lcsc_datasheet_2410010302_Texas-Instruments-TPS65131RGER_C87663.pdf) |
| **U4** | AMS1117-3.3 | C6186 | SOT-223 | [📄 Datasheet](https://www.lcsc.com/datasheet/lcsc_datasheet_2410121508_Advanced-Monolithic-Systems-AMS1117-3-3_C6186.pdf) |
| **U3** | TLV75733PDBVR | C485517 | SOT-23-5 | [📄 Datasheet](https://www.lcsc.com/datasheet/lcsc_datasheet_2304140030_Texas-Instruments-TLV75733PDBVR_C485517.pdf) |
| **X1** | Crystal H1OSC-SUG-8.192M | C20617535 | HC-49S | [📄 Datasheet](https://wmsc.lcsc.com/wmsc/upload/file/pdf/v2/lcsc/2403291505_YXC-Crystal-Oscillators-H1OSC-SUG-8-192M_C20617535.pdf) |

---

## ESD Protection — 8× PRTR5V0U2X (one per channel)

| Des. | Protects | LCSC | Package | Datasheet |
|---|---|---|---|---|
| **D1** | Ch1 (IN1P/IN1N) | C12333 | SOT-143 | [📄](https://www.lcsc.com/datasheet/lcsc_datasheet_2410010302_Nexperia-PRTR5V0U2X-215_C12333.pdf) |
| **D2** | Ch2 (IN2P/IN2N) | C12333 | SOT-143 | " |
| **D3** | Ch3 (IN3P/IN3N) | C12333 | SOT-143 | " |
| **D4** | Ch4 (IN4P/IN4N) | C12333 | SOT-143 | " |
| **D5** | Ch5 (IN5P/IN5N) | C12333 | SOT-143 | " |
| **D6** | Ch6 (IN6P/IN6N) | C12333 | SOT-143 | " |
| **D7** | Ch7 (IN7P/IN7N) | C12333 | SOT-143 | " |
| **D8** | Ch8 (IN8P/IN8N) | C12333 | SOT-143 | " |

> Place each ESD diode as close as possible to its corresponding electrode header pin (≤3mm).

---

## Connectors

| Des. | Component | LCSC | Role |
|---|---|---|---|
| **USB1** | USB-C 16P | C2765186 | Power + data |
| **P1** | Header 2×20 | C50982 | Electrode recording (ch1-4) |
| **P2** | Header 2×20 | C50982 | Electrode recording (ch5-8 + SRB2) |
| **H2** | Header 1×5 | C50950 | Stim outputs |
| **H1** | Header 1×4 | C42431808 | SWD debug |

---

## Capacitors

| Des. | Value | LCSC | Package | Role |
|---|---|---|---|---|
| **C1** | 1µF | C15849 | C0402 | MCU bulk |
| **C2** | 100nF | C1525 | C0402 | MCU decoupling |
| **C3** | 10µF | C83061 | C0805 | MCU bulk |
| **C4, C5** | 4.7µF | C19666 | C0603 | TLV75733 LDO in/out |
| **C6, C7, C8** | 10µF | C83061 | C0805 | TPS65131 DC-DC |
| **C9, C10** | 10µF | C83061 | C0805 | AMS1117 LDO in/out |
| **C11** | 1µF | C15849 | C0402 | ADS1299 AVDD bulk |
| **C12** | 100nF | C1525 | C0402 | ADS1299 AVDD |
| **C13** | 100nF | C1525 | C0402 | ADS1299 DVDD |
| **C14, C15** | 22pF | C1555 | C0402 | Crystal load caps |
| **C16** | 10µF | C83061 | C0805 | DAC8564 bulk |
| **C17** | 100nF | C1525 | C0402 | DAC8564 |
| **C18** | 100nF | C1525 | C0402 | OPA4188 V+ |
| **C19** | 100nF | C1525 | C0402 | OPA4188 V− |

---

## Resistors

| Des. | Value | LCSC | Role |
|---|---|---|---|
| **R1** | 10kΩ | C25744 | ESP32 EN pull-up |
| **R2** | 1kΩ | C106235 | LED1 current limiting |
| **R3** | 1kΩ | C106235 | LED2 current limiting |
| **R4** | 10kΩ | C25744 | ADS1299 PWDN pull-up |
| **R5, R6, R7, R8** | 10kΩ | C25744 | Howland pump Rf (ch 1-4) |
| **R9, R10, R11, R12** | 10kΩ | C25744 | Howland pump Ri (ch 1-4) |
| **R13, R14, R15, R16** | 1kΩ | C106235 | Howland pump Rs (ch 1-4) |
| **R17, R18** | 5.1kΩ | C105873 | USB-C CC1/CC2 pulldown |

---

## LEDs

| Des. | Color | LCSC |
|---|---|---|
| **LED1** | Blue | C72041 |
| **LED2** | Green | C72043 |

---

## Connector Pinouts

### P1 — Electrode Header 1 (ch1-4)
| Pin | Signal |
|---|---|
| 1-2 | Ch1 ± |
| 3-4 | Ch2 ± |
| 5-6 | Ch3 ± |
| 7-8 | Ch4 ± |
| 9-10 | GND |

### P2 — Electrode Header 2 (ch5-8 + SRB2)
| Pin | Signal |
|---|---|
| 1-2 | Ch5 ± |
| 3-4 | Ch6 ± |
| 5-6 | Ch7 ± |
| 7-8 | Ch8 ± |
| **9** | **SRB2 reference electrode** |
| 10 | GND |

### H2 — Stim Header (1×5)
| Pin | Signal |
|---|---|
| 1-4 | Stim ch 1-4 |
| 5 | GND |

### H1 — Debug Header (1×4)
| Pin | Signal |
|---|---|
| 1 | VCC |
| 2 | SWDIO |
| 3 | SWCLK |
| 4 | GND |

---

## Decoupling Caps — Place RIGHT Next to Their IC

| Cap | Value | Belongs To | Notes |
|---|---|---|---|
| C12 | 100nF | ADS1299 AVDD | ≤3mm from pin |
| C11 | 1µF | ADS1299 AVDD bulk | Near U5 |
| C13 | 100nF | ADS1299 DVDD | ≤3mm from pin |
| C14, C15 | 22pF | Crystal load caps | Flank X1 |
| C2 | 100nF | MCU (ESP32) | Near U1 |
| C1 | 1µF | MCU EN filter | Near U1 |
| C3 | 10µF | MCU bulk | Near U1 |
| C17 | 100nF | DAC8564 | Near U6 |
| C16 | 10µF | DAC8564 bulk | Near U6 |
| C18 | 100nF | OPA4188 V+ | Near U7 |
| C19 | 100nF | OPA4188 V− | Near U7 |
| C9, C10 | 10µF | AMS1117 LDO in/out | Near U4 |
| C4, C5 | 4.7µF | TLV75733 LDO in/out | Near U3 |
| C6, C7, C8 | 10µF | TPS65131 DC-DC | Near U2 |

---

## Resistor Roles

| Des. | Value | Role |
|---|---|---|
| R4 | 10kΩ | ADS1299 PWDN pull-up |
| R1 | 10kΩ | ESP32 EN pull-up |
| R17, R18 | 5.1kΩ | USB-C CC1/CC2 pulldown |
| R5, R6, R7, R8 | 10kΩ | Howland pump Rf (ch 1-4) |
| R9, R10, R11, R12 | 10kΩ | Howland pump Ri (ch 1-4) |
| R13, R14, R15, R16 | 1kΩ | Howland pump Rs (ch 1-4) |
| R2, R3 | 1kΩ | LED current limiting |

---

## Recording Modes (software-switchable)

| Mode | Description | Electrodes |
|---|---|---|
| **Differential** | Each ch: independent IN+/IN− | 16 + GND = 17 |
| **Referenced (MEA)** | All IN− → SRB2 reference electrode | 8 + SRB2 + GND = 10 |

Switch via ADS1299 `CHnSET` register MUX bits. No hardware change needed.

---

## Atopile v0.14 Source Structure

```
elec/src/
├── main.ato          # Top-level MyceliumBoard module
├── power.ato         # PowerSupply (AMS1117, TLV75733, TPS65131)
├── adc.ato           # RecordingFrontEnd (ADS1299 + 8× ESD + crystal)
├── mcu.ato           # MCU_Module (ESP32 + LEDs)
├── stim.ato          # StimulationCircuit (DAC8564 + OPA4188)
├── connectors.ato    # USB, electrode headers, debug
└── parts/            # Auto-generated v0.14 packages (23 dirs)
```

### Build Command
```bash
PATH="/Users/michaelsedbon/.local/bin:$PATH" ato build
```

---

## KiCad Tips

- **T** → Get & move footprint by reference (type "U5")
- **Ctrl+F** → Find component by reference
- **X** → Route trace, **V** → via, **/** → bend direction
- **B** → Fill all zones
- **E** → Component properties
