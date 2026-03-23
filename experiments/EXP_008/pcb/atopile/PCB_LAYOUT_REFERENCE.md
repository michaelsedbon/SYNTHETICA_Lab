# MyceliumBoard — PCB Layout Reference

Quick-reference for KiCad PCB layout. Use alongside the PCB editor.

> **Atopile v0.12.5 Build (2026-03-23)** — Updated with RC anti-aliasing filters, shielded RJ45 connectors, DC barrel jack, and corrected DAC wiring.

---

## Board Architecture

```
┌─────────────────────────────────────────┐
│  🟢 ANALOG ZONE        │  🔵 DIGITAL   │
│  U5 (ADS1299)           │  U1 (ESP32)   │
│  D1-D8 (ESD ×8)         │  LED1, LED2   │
│  R20-R35, C31-C46       │  H1 (Debug)   │
│  (RC input filters ×16) │               │
│  X1 (Crystal)           │               │
│  J1, J2 (Electrodes)   │               │
├─────────────────────────┤               │
│  🟡 STIM ZONE           │               │
│  U6 (DAC8564)           │               │
│  U7 (OPA4188)           │               │
│  J3 (Stim+Ref header)  │               │
├─────────────────────────┴───────────────┤
│  🔴 POWER ZONE                          │
│  U4 (3.3V LDO dig)  U2 (±5V DC-DC)    │
│  J4 (Barrel Jack)    USB1 (USB-C)      │
└─────────────────────────────────────────┘
```

---

## ICs — Datasheets & Designators

| Des. | Component | LCSC | Atopile Address | Package | Datasheet |
|---|---|---|---|---|---|
| **U1** | ESP32-S3-WROOM-1-N16R8 | C2913202 | `mcu.mcu` | WiFi module | [Espressif](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf) |
| **U2** | TPS65131RGER (±5V DC-DC) | C87663 | `power.dcdc` | QFN-24 | [TI TPS65131](https://www.ti.com/lit/ds/symlink/tps65131.pdf) |
| **U4** | AMS1117-3.3 (DVDD 3.3V LDO) | C6186 | `power.ldo_dig` | SOT-223 | [AMS1117](http://www.advanced-monolithic.com/pdf/ds1117.pdf) |
| **U5** | ADS1299IPAGR (8ch ADC) | C476817 | `recording.adc` | TQFP-64 | [TI ADS1299](https://www.ti.com/lit/ds/symlink/ads1299.pdf) |
| **U6** | DAC8564IAPWR (4ch DAC) | C2680186 | `stimulation.dac` | TSSOP-16 | [TI DAC8564](https://www.ti.com/lit/ds/symlink/dac8564.pdf) |
| **U7** | OPA4188AIPWR (quad opamp) | C118204 | `stimulation.opamp` | TSSOP-14 | [TI OPA4188](https://www.ti.com/lit/ds/symlink/opa4188.pdf) |
| **X1** | Crystal 8.192MHz | C20617535 | `recording.xtal` | HC-49S | — |

---

## ESD Protection — 8× PRTR5V0U2X (one per channel)

| Des. | Protects | LCSC | Atopile Address | Datasheet |
|---|---|---|---|---|
| **D1** | Ch1 (IN1P/IN1N) | C12333 | `recording.esd1` | [Nexperia](https://www.nexperia.com/products/esd-protection-tvs-filtering-signal-conditioning/esd-protection/PRTR5V0U2X.html) |
| **D2** | Ch2 (IN2P/IN2N) | C12333 | `recording.esd2` | — |
| **D3** | Ch3 (IN3P/IN3N) | C12333 | `recording.esd3` | — |
| **D4** | Ch4 (IN4P/IN4N) | C12333 | `recording.esd4` | — |
| **D5** | Ch5 (IN5P/IN5N) | C12333 | `recording.esd5` | — |
| **D6** | Ch6 (IN6P/IN6N) | C12333 | `recording.esd6` | — |
| **D7** | Ch7 (IN7P/IN7N) | C12333 | `recording.esd7` | — |
| **D8** | Ch8 (IN8P/IN8N) | C12333 | `recording.esd8` | — |

> Place each ESD diode as close as possible to its corresponding RJ45 connector pin (≤3mm).

---

## Connectors

| Des. | Component | LCSC | Role | Atopile Address |
|---|---|---|---|---|
| **USB1** | USB-C 16P | C2765186 | Power + data | `usb.usb` |
| **J1** | Shielded RJ45 (8P8C) | C2683359 | Recording electrodes ch1-4 | `rec_electrodes.hdr_rec1` |
| **J2** | Shielded RJ45 (8P8C) | C2683359 | Recording electrodes ch5-8 | `rec_electrodes.hdr_rec2` |
| **J3** | Shielded RJ45 (8P8C) | C2683359 | Stim outputs + SRB2 | `rec_electrodes.hdr_stim` |
| **J4** | DC Barrel Jack | C720557 | External 5V Power | `dc_jack` |
| **H1** | Header 1×4 | C42431808 | SWD debug | `debug.hdr` |

---

## Anti-Aliasing RC Input Filters — 16× (one per input line)

> [!NOTE]
> Each of the 16 analog input lines (8× P, 8× N) has a series **10kΩ** resistor and a shunt **1nF** capacitor to AGND, placed between the ESD diode and the ADS1299 input pin.
>
> **Signal chain:** Electrode → RJ45 → ESD Diode → 10kΩ Resistor → ADS1299 pin ← 1nF Cap → AGND
>
> Hardware cutoff: **~16 kHz** (with R_filt only). With mycelium contact impedance (~1MΩ), effective cutoff drops to **~160 Hz**, naturally rejecting 50/60Hz mains and RF interference while passing all biological signals untouched.

| Des. | Value | LCSC | Role | Atopile Address |
|---|---|---|---|---|
| **R20-R35** | 10kΩ (×16) | C25744 | Series filter resistors | `recording.r_in1p` … `r_in8n` |
| **C31-C46** | 1nF (×16) | C1523 | Shunt filter capacitors | `recording.c_in1p` … `c_in8n` |

---

## Capacitors

| Des. | Value | LCSC | Package | Role | Atopile Address |
|---|---|---|---|---|---|
| **C1** | 1µF | C15849 | C0603 | MCU EN filter | `mcu.c_en` |
| **C2** | 100nF | C1525 | C0402 | MCU decoupling | `mcu.c_vdd1` |
| **C3** | 10µF | C83061 | C0805 | MCU bulk | `mcu.c_vdd2` |
| **C6** | 10µF | C83061 | C0805 | TPS65131 DC-DC input | `power.c_dcdc_in` |
| **C7** | 10µF | C83061 | C0805 | TPS65131 VNEG output | `power.c_dcdc_neg` |
| **C8** | 10µF | C83061 | C0805 | TPS65131 VPOS output | `power.c_dcdc_pos` |
| **C9** | 10µF | C83061 | C0805 | AMS1117 LDO input | `power.c_dig_in` |
| **C10** | 10µF | C83061 | C0805 | AMS1117 LDO output | `power.c_dig_out` |
| **C11** | 1µF | C15849 | C0603 | ADS1299 AVDD bulk | `recording.c_avdd_bulk` |
| **C12** | 100nF | C1525 | C0402 | ADS1299 AVDD decoupling | `recording.c_avdd` |
| **C13** | 100nF | C1525 | C0402 | ADS1299 DVDD decoupling | `recording.c_dvdd` |
| **C14** | 22pF | C1555 | C0402 | Crystal load cap 1 | `recording.c_xtal1` |
| **C15** | 22pF | C1555 | C0402 | Crystal load cap 2 | `recording.c_xtal2` |
| **C16** | 10µF | C83061 | C0805 | DAC8564 bulk | `stimulation.c_dac_bulk` |
| **C17** | 100nF | C1525 | C0402 | DAC8564 decoupling | `stimulation.c_dac` |
| **C18** | 100nF | C1525 | C0402 | OPA4188 V+ decoupling | `stimulation.c_op_vcc` |
| **C19** | 100nF | C1525 | C0402 | OPA4188 V− decoupling | `stimulation.c_op_vee` |

---

## Resistors

| Des. | Value | LCSC | Role | Atopile Address |
|---|---|---|---|---|
| **R1** | 10kΩ | C25744 | ESP32 EN pull-up | `mcu.r_en` |
| **R2** | 1kΩ | C106235 | LED1 (blue activity) current limiting | `mcu.r_led_act` |
| **R3** | 1kΩ | C106235 | LED2 (green power) current limiting | `mcu.r_led_pwr` |
| **R4** | 10kΩ | C25744 | ADS1299 PWDN pull-up | `recording.r_pwdn` |
| **R5** | 10kΩ | C25744 | Howland pump Rf ch1 | `stimulation.rf1` |
| **R6** | 10kΩ | C25744 | Howland pump Rf ch2 | `stimulation.rf2` |
| **R7** | 10kΩ | C25744 | Howland pump Rf ch3 | `stimulation.rf3` |
| **R8** | 10kΩ | C25744 | Howland pump Rf ch4 | `stimulation.rf4` |
| **R9** | 10kΩ | C25744 | Howland pump Ri ch1 | `stimulation.ri1` |
| **R10** | 10kΩ | C25744 | Howland pump Ri ch2 | `stimulation.ri2` |
| **R11** | 10kΩ | C25744 | Howland pump Ri ch3 | `stimulation.ri3` |
| **R12** | 10kΩ | C25744 | Howland pump Ri ch4 | `stimulation.ri4` |
| **R13** | 1kΩ | C106235 | Howland pump Rs ch1 | `stimulation.rs1` |
| **R14** | 1kΩ | C106235 | Howland pump Rs ch2 | `stimulation.rs2` |
| **R15** | 1kΩ | C106235 | Howland pump Rs ch3 | `stimulation.rs3` |
| **R16** | 1kΩ | C106235 | Howland pump Rs ch4 | `stimulation.rs4` |
| **R17** | 5.1kΩ | C105873 | USB-C CC1 pulldown | `usb.r_cc1` |
| **R18** | 5.1kΩ | C105873 | USB-C CC2 pulldown | `usb.r_cc2` |
| **R19** | 10kΩ | C25744 | GPIO0 (BOOT) external pull-up | `mcu.r_boot` |

---

## Buttons

| Des. | Component | LCSC | Role | Atopile Address |
|---|---|---|---|---|
| **SW1** | SKRPACE010 (4.2×3.2mm) | C139797 | RESET — pulls EN low | `mcu.btn_reset` |
| **SW2** | SKRPACE010 (4.2×3.2mm) | C139797 | BOOT — pulls GPIO0 low | `mcu.btn_boot` |

> **Firmware download:** Hold SW2 (BOOT) → press SW1 (RESET) → release SW1 → release SW2 → ESP enters download mode.
>
> The ESP32-S3 has a **built-in USB Serial/JTAG controller** on IO19/IO20 (connected to USB-C). After the first successful flash, normal firmware updates can be done via USB without pressing buttons. Buttons are needed for: first flash (empty chip), firmware crash recovery, or if code reconfigures the USB pins.

---

## LEDs

| Des. | Color | LCSC | Wiring | Atopile Address |
|---|---|---|---|---|
| **LED1** | Blue (activity) | C72041 | GPIO IO8 → R2 → LED → GND | `mcu.led_act` |
| **LED2** | Green (power) | C72043 | DVDD → R3 → LED → GND (always on) | `mcu.led_pwr` |

---

## Connector Pinouts

> [!NOTE]
> The RJ45 connectors (`J1`, `J2`, `J3`) are automatically assigned the **KH-RJ45-56-8P8C** (LCSC C2683359) 3D model and footprint by Atopile. This is a purely mechanical, shielded, through-hole jack with **no magnetics**, ensuring your low-frequency biological signals are not filtered out.

### J1 — Electrode Port 1 (Ch 1-4)
| Pin | Signal | Notes |
|---|---|---|
| **1-2** | Ch4 ± | Twisted pair (reversed for routing) |
| **3-4** | Ch3 ± | Twisted pair |
| **5-6** | Ch2 ± | Twisted pair |
| **7-8** | Ch1 ± | Twisted pair |
| **Shield**| GND | Tie outer metal block to GND plane |

### J2 — Electrode Port 2 (Ch 5-8)
| Pin | Signal | Notes |
|---|---|---|
| **1-2** | Ch8 ± | Twisted pair (reversed for routing) |
| **3-4** | Ch7 ± | Twisted pair |
| **5-6** | Ch6 ± | Twisted pair |
| **7-8** | Ch5 ± | Twisted pair |
| **Shield**| GND | Tie outer metal block to GND plane |

### J3 — Stim & Reference Port
| Pin | Signal | Notes |
|---|---|---|
| **1-4** | Stim Ch 1 to 4 | Stimulation outputs |
| **5**   | SRB2 | Reference electrode |
| **6-8** | GND | Ground lines |
| **Shield**| GND | Tie outer metal block to GND plane |

### H1 — Debug Header (1×4)
| Pin | Signal |
|---|---|
| 1 | VCC |
| 2 | SWDIO |
| 3 | SWCLK |
| 4 | GND |

### J4 — DC Barrel Jack (External Power)
> [!CAUTION]
> **NEVER plug in the USB cable and the DC Barrel Jack at the same time.** Both connectors feed directly into the `VBUS` power net. If you plug both in, the power sources will fight, potentially destroying your computer's USB port or the external wall adapter. Only use a strictly regulated 5V DC adapter.

| Pin | Signal | Notes |
|---|---|---|
| **Center** | VBUS (5V) | Center positive 5V supply |
| **Sleeve** | GND | Outer metal sleeve |
| **Switch** | GND | Insertion detection switch (tied to GND) |

---

## Stimulation Circuit — DAC Design Choices

> [!IMPORTANT]
> **Why DAC8564 + OPA4188?**
> The **DAC8564** is a 4-channel, 16-bit, voltage-output DAC with an internal 2.5V reference. It produces precise analog voltages (0 to AVDD) that are fed into the **OPA4188** quad precision op-amp configured as 4× Howland current pumps. This converts each DAC voltage into a **programmable constant-current** output (0–200µA), which is what biological stimulation requires — current, not voltage.

### DAC8564 Pin Wiring (verified against [datasheet](https://www.ti.com/lit/ds/symlink/dac8564.pdf))

| Pin | Signal | Net | Notes |
|---|---|---|---|
| AVDD | Analog supply | VPOS (+5V) | Powers the analog core |
| IOVDD | Digital I/O supply | DVDD (3.3V) | Must match ESP32 GPIO voltage |
| GND | Ground | GND | — |
| VREFH/VREFOUT | Reference | VPOS (+5V) | Using AVDD as reference → full-scale output = 5V |
| VREFL | Reference low | GND | — |
| SCLK | SPI clock | ESP32 SPI2 | — |
| DIN | SPI data in | ESP32 SPI2 | — |
| nSYNC | SPI chip select | ESP32 GPIO | Active low |
| LDAC | Load DAC | GND | Tied low → transparent mode (outputs update immediately) |
| nENABLE | Output enable | GND | Tied low → outputs enabled |
| A0, A1 | Address | GND | Device address = 00 |
| VOUTA-D | Outputs | → Howland pumps | 4 independent voltage outputs |

### Howland Current Pump Topology (per channel)

```
DAC_VOUTx ──[Ri 10kΩ]──► (+) OPAMPx
                          (-) ◄──[Rf 10kΩ]──┐
                          OUT ──────────────┤
                                           └──[Rs 1kΩ]──► STIM_OUTx
```

**I_out = (V_dac / Rs) × (Rf / Ri) = V_dac × 10 / 1k = V_dac / 100**
At max DAC output (5V): I_out = 50µA per channel (adjustable via Rs value).

---

## Decoupling & Critical Caps — Place RIGHT Next to Their IC

| Cap | Value | Belongs To | Notes | Atopile Address |
|---|---|---|---|---|
| **ADS1299 (U5)** | | | | |
| C12 | 100nF | ADS1299 AVDD | ≤3mm from AVDD pins | `recording.c_avdd` |
| C11 | 1µF | ADS1299 AVDD bulk| Near U5 | `recording.c_avdd_bulk` |
| C13 | 100nF | ADS1299 DVDD | ≤3mm from DVDD pins | `recording.c_dvdd` |
| C25 | 10µF | ADS1299 VCAP1 | **CRITICAL** for internal 1.8V reset | `recording.c_vcap1` |
| C26-C28 | 1µF | ADS1299 VCAP2-4 | Internal reference buffers | `recording.c_vcap2`, `3`, `4` |
| C30 | 1µF | ADS1299 VREFP | Internal reference output | `recording.c_vrefp` |
| C14, C15 | 22pF | Crystal load caps | Flank X1 closely | `recording.c_xtal1`, `2` |
| **Power (U2, U4, Filter)** | | | | |
| C4 | 100nF | 5V Analog Filter | Filter for AVDD rail | `power.c_avdd_filt` |
| C5 | 10µF | 5V Analog Bulk | Bulk for AVDD rail | `power.c_avdd_in` |
| C9, C10 | 10µF | AMS1117 3.3V LDO| In/Out for digital 3.3V (U4) | `power.c_dig_in`, `out` |
| C6 | 10µF | TPS65131 VIN | Input bypass for U2 | `power.c_dcdc_in` |
| C8 | 10µF | TPS65131 VPOS | +5V output bulk | `power.c_dcdc_pos` |
| C7 | 10µF | TPS65131 VNEG | -5V output bulk | `power.c_dcdc_neg` |
| C24 | 100nF | TPS65131 VREF | Internal reference bypass | `power.c_vref` |
| C20, C21 | 100nF | TPS65131 Charge | For CN/CP charge pumps | `power.c_cn`, `cp` |
| C22, C23 | 100nF | TPS65131 Soft | For PSN/PSP soft-start | `power.c_psn`, `psp` |
| **MCU (U1)** | | | | |
| C2 | 100nF | MCU VDD bypass | Near U1 | `mcu.c_vdd1` |
| C3 | 10µF | MCU VDD bulk | Near U1 | `mcu.c_vdd2` |
| C1 | 1µF | MCU EN filter | Near U1 EN pin | `mcu.c_en` |
| **Stimulation (U6, U7)** | | | | |
| C17 | 100nF | DAC8564 bypass | Near U6 | `stimulation.c_dac` |
| C16 | 10µF | DAC8564 bulk | Near U6 | `stimulation.c_dac_bulk` |
| C18 | 100nF | OPA4188 V+ bypass| Near U7 (+5V) | `stimulation.c_op_vcc` |
| C19 | 100nF | OPA4188 V- bypass| Near U7 (-5V) | `stimulation.c_op_vee` |

---

## Recording Modes (software-switchable)

| Mode | Description | Electrodes |
|---|---|---|
| **Differential** | Each ch: independent IN+/IN− | 16 + GND = 17 |
| **Referenced (MEA)** | All IN− → SRB2 reference electrode | 8 + SRB2 + GND = 10 |

Switch via ADS1299 `CHnSET` register MUX bits. No hardware change needed.

---

## Atopile Source Structure

```
elec/src/
├── main.ato          # Top-level MyceliumBoard module
├── power.ato         # PowerSupply (AMS1117, TPS65131, Input Filter)
├── adc.ato           # RecordingFrontEnd (ADS1299 + 8× ESD + 16× RC filter + crystal)
├── mcu.ato           # MCU_Module (ESP32 + LEDs)
├── stim.ato          # StimulationCircuit (DAC8564 + OPA4188 + 4× Howland pump)
├── connectors.ato    # USB, RJ45 electrode jacks, DC barrel jack, debug
└── parts/            # Auto-generated packages (~25 dirs)
```

### Build Command
```bash
ato build
```

---

## Routing Guidelines

### PCB Stackup — 4 layers

| Layer | Net | Purpose |
|---|---|---|
| **F.Cu** | Signal | Component side, analog + digital traces |
| **In1.Cu** | GND | Solid ground plane (split analog/digital) |
| **In2.Cu** | Power | DVDD, AVDD, V+5, V−5 zones |
| **B.Cu** | Signal | Bottom traces, optional components |

> **Board size target:** ~50 × 60 mm. **Finish:** ENIG (required for TQFP-64 fine-pitch).

### Trace Widths

| Type | Width | Notes |
|---|---|---|
| Signal (default) | 0.2 mm | SPI, GPIO, LED |
| Analog inputs (electrode → ESD → RC → ADS1299) | 0.15–0.2 mm | Keep short, matched length per ± pair |
| Power traces | 0.4–0.5 mm | VIN, DVDD, AVDD |
| High current (VBUS 5V) | 0.5–0.8 mm | USB VBUS to regulators |
| USB D+/D− | 0.3 mm | 90Ω differential impedance target |

### Ground Plane Strategy

- **In1.Cu = solid GND plane**, split into **analog GND** and **digital GND** zones
- Single bridge point under ADS1299 (the chip connects AVSS and DGND internally)
- Analog zone covers: U5, D1-D8, R20-R35, C31-C46, X1, U6, U7, J1, J2, J3
- Digital zone covers: U1, USB1, H1, LED1, LED2, U4
- Power section (U2, TPS65131) straddles the boundary
- Place GND stitching vias every 5–10 mm around the board edge and between zones

### ADS1299 — Critical Layout Rules (from TI datasheet)

1. **Decoupling first**: C12 (100nF) ≤3 mm from AVDD pin, C13 (100nF) ≤3 mm from DVDD pin
2. **AVDD1 and AVSS1** must be separately decoupled (C11 bulk 1µF nearby)
3. **Crystal X1**: traces ≤10 mm, C14/C15 flanking, **no copper pour or routing under crystal**
4. **GND vias** around crystal to shield it
5. **Analog inputs**: route on one layer (F.Cu), no vias in signal path, keep away from digital bus
6. **Differential pairs**: keep IN+/IN− traces parallel, equal length within ±1 mm, spacing ≥ 2× trace width
7. **RC filter placement**: R_filt as close to ESD diode as possible, C_filt as close to ADS1299 input pin as possible
8. **BIASOUT → BIASINV**: route as short as possible, guard with GND on both sides
9. **SRB2**: if used as common reference, route as a star from ADS1299 to J3 pin 5
10. **SPI1 bus**: signals can tolerate longer runs (~30 mm OK at 4 MHz SCLK)

### Stimulation Circuit — Isolation Rules

- Route stim traces (DAC → opamp → resistors → J3) **in the analog zone** but physically separated from recording inputs by ≥5 mm
- Keep Howland pump resistor sets (Rf/Ri/Rs per channel) grouped tightly near OPA4188
- Match Rf/Ri pairs physically (symmetric routing) for current pump accuracy
- Stim outputs to J3: use wider traces (0.3 mm) — carries up to 200 µA but low impedance helps

### USB — Differential Pair

- Route D+/D− (U1.IO20, U1.IO19) as a differential pair: parallel, equal length, 0.3 mm wide, 0.15 mm gap
- Keep total length ≤50 mm (USB full-speed is forgiving)
- R17/R18 (CC pulldowns) close to USB1 connector

### Placement Order (do this first, then route)

1. **Connectors** → USB1 on one edge, J1/J2 on opposite edge, H1 on a side, J4 near USB1
2. **U5 (ADS1299)** → center-left near electrodes
3. **D1-D8 (ESD)** → line between J1/J2 and U5 (≤3 mm from RJ45 pins)
4. **R20-R35 (filter R)** → between ESD diodes and U5
5. **C31-C46 (filter C)** → right next to U5 input pins
6. **X1 + C14/C15** → close to U5 CLK pin
7. **U5 decoupling** (C11, C12, C13) → right next to U5
8. **U6 + U7 (stim)** → below U5, separate from inputs
9. **J3 (stim port)** → near U7 outputs
10. **U1 (ESP32)** → near USB1, digital side
11. **Power (U2, U4)** → near USB1 input, bottom zone
12. **LEDs + debug** → board edge

### JLCPCB Manufacturing Limits

| Parameter | Minimum |
|---|---|
| Trace width | 0.127 mm (5 mil) — use 0.2 mm |
| Trace spacing | 0.127 mm (5 mil) — use 0.15 mm |
| Via drill | 0.3 mm |
| Via annular ring | 0.15 mm (→ 0.6 mm via pad) |
| Min hole-to-hole | 0.254 mm |
| Solder mask bridge | 0.1 mm |
| 4-layer PCB | JLC04161H-7628 stackup (standard) |

### Routing Priority Checklist

1. ☐ Ground plane (In1.Cu) — analog/digital split with single bridge
2. ☐ Power plane (In2.Cu) — AVDD, DVDD, V+5, V−5 zones
3. ☐ Analog inputs — electrode → ESD → RC filter → ADS1299 (shortest path)
4. ☐ Crystal — X1 to U5, flanked by C14/C15
5. ☐ SPI1 bus — U1 → U5 (SCLK, DIN, DOUT, CS, DRDY, START, RESET)
6. ☐ SPI2 bus — U1 → U6 (SCLK, DIN, SYNC)
7. ☐ Stimulation chain — U6 → U7 → R → J3
8. ☐ USB data — USB1 → U1 (differential pair)
9. ☐ Power routing — VIN traces, regulator I/O
10. ☐ LEDs and debug — last priority

---

## KiCad Tips

- **T** → Get & move footprint by reference (type "U5")
- **Ctrl+F** → Find component by reference
- **X** → Route trace, **V** → via, **/** → bend direction
- **B** → Fill all zones
- **E** → Component properties
