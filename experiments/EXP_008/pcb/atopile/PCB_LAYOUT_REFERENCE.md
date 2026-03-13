# MyceliumBoard — PCB Layout Reference

Quick-reference for KiCad PCB layout. Use alongside the PCB editor.

---

## Board Architecture

```
┌─────────────────────────────────────────┐
│  🟢 ANALOG ZONE        │  🔵 DIGITAL   │
│  U11 (ADS1299)          │  U41 (ESP32)  │
│  U19-U22 (ESD)          │  U46,U48 LEDs │
│  U13 (Crystal)          │  U56 (Debug)  │
│  U50,U51 (Electrodes)  │               │
├─────────────────────────┤               │
│  🟡 STIM ZONE           │               │
│  U23 (DAC8564)          │               │
│  U26 (OPA4188)          │               │
│  U52 (Stim header)     │               │
├─────────────────────────┴───────────────┤
│  🔴 POWER ZONE                          │
│  U1 (3.3V LDO dig)  U4 (3.3V LDO ana) │
│  U7 (±5V DC-DC)     U53 (USB-C)       │
└─────────────────────────────────────────┘
```

---

## Key ICs — Find These First

| Designator | Component | Package | Role |
|---|---|---|---|
| **U41** | ESP32-S3-WROOM-1 | Large WiFi module | MCU + WiFi |
| **U11** | ADS1299 | TQFP-64 (big square) | 8ch 24-bit ADC |
| **U23** | DAC8564 | TSSOP-16 | 4ch 16-bit DAC |
| **U26** | OPA4188 | TSSOP-14 | Quad op-amp (Howland pumps) |
| **U7** | TPS65131 | QFN-24 | ±5V DC-DC converter |
| **U1** | AMS1117-3.3 | SOT-223 | Digital 3.3V LDO |
| **U4** | TLV75733 | SOT-23-5 | Analog 3.3V LDO (low noise) |
| **U13** | Crystal 8.192kHz | HC-49S (big can) | ADS1299 clock |

---

## Connectors — Place on Board Edges

| Designator | Component | Role |
|---|---|---|
| **U53** | USB-C 16P (SMD) | Power + data input |
| **U50** | 2×5 pin header | Recording electrodes ch 1-4 |
| **U51** | 2×5 pin header | Recording electrodes ch 5-8 |
| **U52** | 1×5 pin header | Stimulation outputs |
| **U56** | 1×4 pin header | SWD debug |

---

## Passives — Decoupling Caps (place RIGHT next to their IC)

| Designator | Value | Belongs To | Notes |
|---|---|---|---|
| **U16, U24** | 100nF (C0402) | ADS1299 (AVDD, DVDD) | ≤3mm from pins |
| **U17** | 1µF (C0402) | ADS1299 (AVDD bulk) | Near U11 |
| **U14, U15** | 22pF (C0402) | ADS1299 crystal load | Flank U13 |
| **U28** | 100nF (C0402) | MCU decoupling | Near U41 |
| **U43** | 1µF (C0402) | MCU EN RC filter | Near U41 |
| **U18** | 100nF (C0402) | DAC8564 | Near U23 |
| **U44** | 100nF (C0402) | OPA4188 VCC | Near U26 |
| **U27** | 100nF (C0402) | OPA4188 VEE | Near U26 |
| **U2, U3** | 10µF (C0805) | Power LDOs in/out | Near U1 |
| **U5, U6** | 4.7µF (C0603) | Analog LDO in/out | Near U4 |
| **U8, U9, U10** | 10µF (C0805) | DC-DC in/pos/neg | Near U7 |
| **U25** | 10µF (C0805) | DAC bulk | Near U23 |
| **U45** | 10µF (C0805) | MCU bulk | Near U41 |

---

## Passives — Resistors

| Designator | Value | Role |
|---|---|---|
| **U12** | 10kΩ | ADS1299 PWDN pull-up |
| **U29** | 10kΩ | MCU EN pull-up |
| **U54, U55** | 5.1kΩ | USB-C CC1/CC2 |
| **U30, U32, U35, U42** | 10kΩ | Howland pump Rf (ch 1-4) |
| **U33, U36, U38, U39** | 10kΩ | Howland pump Ri (ch 1-4) |
| **U31, U34, U37, U40** | 1kΩ | Howland pump Rs (ch 1-4) + LEDs |
| **U47, U49** | 1kΩ | LED current limiting |

---

## ESD Protection

| Designator | Component | Protects |
|---|---|---|
| **U19** | PRTR5V0U2X | Electrode ch 1 (±) |
| **U20** | PRTR5V0U2X | Electrode ch 2 (±) |
| **U21** | PRTR5V0U2X | Electrode ch 3 (±) |
| **U22** | PRTR5V0U2X | Electrode ch 4 (±) |

---

## LEDs

| Designator | Color | Function |
|---|---|---|
| **U46** | Green | Power indicator |
| **U48** | Blue | Activity (GPIO8) |

---

## KiCad Tips

- **Hover + E** → Open component properties (see value, footprint)
- **Hover + I** → Quick inspect
- **T** → Get/move component by reference (type "U11" to jump to ADS1299)
- **Ctrl+F** → Find component by reference
- **N** → Toggle ratsnest visibility
