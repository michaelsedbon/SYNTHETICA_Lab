# PCB Design Research Report — Mycelium Sensor/Stim Board

## Search Summary
- **Date:** 2026-03-09
- **Target:** 8-channel extracellular action potential recording + 4-channel programmable current stimulation board for *Pleurotus eryngii* mycelium
- **Sources searched:** GitHub, Hackaday, OpenBCI, Open Ephys, TI reference designs, bioRxiv, PubMed, OSHWA
- **Projects found:** 12 total, 6 shortlisted below

## Signal Requirements (from EXP_006 characterisation)

These numbers drive all analog design decisions:

| Parameter | Value | Source |
|-----------|-------|--------|
| Spontaneous amplitude | 35–1868 µV (mean ~135 µV) | Mishra 2024 |
| UV-evoked amplitude | Up to 18,569 µV | Mishra 2024 |
| Spike width | 1.1 s mean (range 0.5–10 s) | Mishra 2024 |
| Spike frequency | 0.12 Hz mean (max 0.6 Hz) | Mishra 2024 |
| Bandwidth needed | DC – 5 Hz (spikes are sub-Hz) | Derived |
| Electrode impedance | 1.4 ± 0.25 MΩ (mycelium plate) | Mishra 2024 |
| Noise floor target | < 5 µV (signals classified as noise below this) | Mishra 2024 |
| Sampling rate | 10 S/s sufficient; 100 S/s recommended for margin | Mishra 2024 |
| Input voltage range | ±39 mV (used in Mishra setup) | Mishra 2024 |
| Recording duration | 30+ days continuous | Mishra 2024 |

> [!IMPORTANT]
> The signals are **DC-coupled, sub-Hz, µV-range** — this is very different from neural EEG (1–100 Hz, < 100 µV). Standard EEG front-ends may have DC-blocking that cuts our signals. The ADS1299 supports DC-coupled recording, which is critical.

---

## Top Reference Designs

### 1. OpenBCI Cyton Board ⭐ 5/5

- **Source:** [github.com/OpenBCI/V3_Hardware_Design_Files](https://github.com/OpenBCI/V3_Hardware_Design_Files)
- **License:** MIT
- **Last updated:** December 2024 (active issues)
- **What it does:** 8-channel biosignal acquisition board using ADS1299 + PIC32MX250F128B
- **Architecture:** ADS1299 (8ch 24-bit ADC + built-in PGA) → SPI → PIC32 MCU → BLE/USB
- **Key components:**
  - ADS1299IPAG (TQFP-64) — 8ch 24-bit bio ADC with integrated PGA
  - PIC32MX250F128B — 32-bit MCU
  - RFD22301 — BLE module (optional for us)
  - Passive components for filtering and decoupling
- **BOM cost estimate:** ~$60–80 for components
- **Strengths:**
  - Most proven open-source biopotential platform (thousands built worldwide)
  - ADS1299 handles the entire analog front-end in one chip (PGA + MUX + ADC)
  - 24-bit resolution, < 1 µV input-referred noise
  - Built-in lead-off detection and bias drive
  - Extensive community support and documentation
  - Supports DC-coupled mode (critical for our sub-Hz mycelium signals)
- **Weaknesses:**
  - Uses Design Spark PCB (not KiCad) — needs conversion
  - No stimulation capability — recording only
  - BLE module adds cost/complexity we don't need
  - PIC32 ecosystem is less common than STM32/ESP32
- **Relevant for us because:** The ADS1299 is the ideal ADC — 8 channels, 24-bit, µV noise, DC-coupled, well-documented. We'll use the same chip with a different MCU and add stimulation.

---

### 2. Stimjim (Open Ephys) ⭐ 5/5

- **Source:** [github.com/open-ephys/stimjim](https://github.com/open-ephys/stimjim)
- **License:** Open source (Open Ephys)
- **Last updated:** Active
- **What it does:** 2-channel precision electrical stimulator for neuroscience — both current and voltage modes
- **Architecture:** Teensy 3.6 MCU → DAC → Improved Howland current pump → Isolated output
- **Key components:**
  - Teensy 3.6 (ARM Cortex-M4F) — MCU with built-in DAC
  - Improved Howland current pump (op-amp circuit)
  - Precision resistors for current sensing
  - Optocoupler/isolation between channels
- **BOM cost estimate:** ~$50–80
- **Strengths:**
  - KiCad design files — can be directly referenced for our stimulation circuit
  - Microsecond precision, microampere resolution
  - Well-characterized in a published paper (bioRxiv)
  - Two electrically isolated channels
  - USB serial control interface
  - Proven in neuroscience research
- **Weaknesses:**
  - Only stimulation, no recording (needs separate recording board)
  - Teensy 3.6 is discontinued — would need to adapt to Teensy 4.x or other MCU
  - Designed for higher current ranges than we need (mA range vs our µA range)
- **Relevant for us because:** The Howland current pump circuit is exactly what we need for stimulation. We'll adapt the design for our 0–200 µA range and integrate it onto the same board as the ADS1299 recording.

---

### 3. TI ADS1299EEGFE-PDK ⭐ 4/5

- **Source:** [ti.com/tool/ADS1299EEGFE-PDK](https://www.ti.com/tool/ADS1299EEGFE-PDK)
- **License:** TI evaluation kit (reference design, free to use)
- **What it does:** Official TI evaluation board for ADS1299 in EEG applications
- **Architecture:** ADS1299 → SPI → MSP430 → USB
- **Key components:**
  - ADS1299IPAG
  - MSP430F5529 MCU
  - Complete power supply for analog and digital domains
  - ESD protection on all inputs
  - Full schematic and BOM in user guide (SLAU443)
- **BOM cost estimate:** N/A (reference only)
- **Strengths:**
  - Official TI reference — guaranteed correct ADS1299 implementation
  - Complete schematic with all bypass caps, reference voltages, power sequencing
  - The "definitive" ADS1299 application circuit
  - User guide (SLAU443) is extremely detailed
- **Weaknesses:**
  - Not open-source hardware in the OSHW sense
  - Uses MSP430 (we'd want something more common)
  - PCB design files not readily available in KiCad format
- **Relevant for us because:** This is the gold-standard reference for how to wire up the ADS1299 correctly — bypass caps, analog routing, power domains. We should follow this layout guidance even if we don't copy it exactly.

---

### 4. OpenMEA Platform ⭐ 3/5

- **Source:** [github.com/InteGerard/OpenMEA](https://github.com/InteGerard/OpenMEA)
- **License:** Open source
- **What it does:** Complete closed-loop MEA system — recording + stimulation + software
- **Architecture:** MEA → Headstage (neural interface IC, 16ch) → LVDS → Zynq FPGA → PC
- **Key components:**
  - Custom neural interface IC module (16ch record + stim)
  - LVDS interface board
  - Zynq-based FPGA processing system
  - OpenMEA Studio software
- **Strengths:**
  - Only fully open-source project with both recording AND stimulation
  - Closed-loop capability (stimulate based on recordings)
  - Full system from electrodes to software
  - Published in peer-reviewed paper (bioRxiv)
- **Weaknesses:**
  - Very complex — Zynq FPGA, custom ICs, multiple PCBs
  - Overkill for our application (designed for neural cultures, not mycelium)
  - Hard to replicate without FPGA expertise
  - Not designed for JLCPCB assembly
- **Relevant for us because:** Architecture reference for how to combine recording + stimulation on one platform. We'll use a simpler approach (ADS1299 + DAC-based stim) but the system concept is informative.

---

### 5. BioAmp EXG Pill (Upside Down Labs) ⭐ 4/5

- **Source:** [github.com/upsidedownlabs/BioAmp-EXG-Pill](https://github.com/upsidedownlabs/BioAmp-EXG-Pill)
- **License:** OSHW certified
- **What it does:** Compact analog front-end for biopotential (ECG/EMG/EOG/EEG)
- **Architecture:** Electrodes → Instrumentation Amp (TL084) → Band-pass filter → ADC (external)
- **Key components:**
  - TL084HIPWR — Quad JFET op-amp (instrumentation amp)
  - Passive R/C filter network
  - Electrode connector
- **BOM cost estimate:** ~$5–10
- **Strengths:**
  - OSHW certified — highest quality bar for open hardware
  - Extremely simple and well-documented
  - KiCad-compatible design files available
  - Configurable gain and bandwidth
  - Very cheap and easy to assemble
- **Weaknesses:**
  - Single-channel only (we need 8)
  - Needs external ADC (no integrated solution)
  - TL084 noise is higher than ADS1299's built-in PGA
  - AC-coupled by default — would need modification for our DC signals
- **Relevant for us because:** Good reference for a minimal biopotential front-end. However, the ADS1299 integrates all this functionality (PGA + filter + ADC) into one chip, making discrete front-end design unnecessary for our application.

---

### 6. Stimjim + OpenBCI Combined Concept ⭐ 4/5

- **Source:** Conceptual — combining #1 and #2
- **What it does:** Recording (ADS1299) + Stimulation (Howland pump) on one board
- **Architecture:**
  ```
  Electrodes (8ch) → ADS1299 → SPI → ESP32/STM32 MCU → USB
                                                         │
  Stim Electrodes (4ch) ← Howland Pump ← DAC ← SPI ─────┘
  ```
- **Key components:**
  - ADS1299IPAG — 8ch recording
  - DAC8564 or MCP4728 — 4ch 16-bit DAC for stimulation waveform generation
  - OPA4227 or OPA4188 — precision op-amps for Howland current pump
  - ESP32-S3 or STM32F4 — MCU with USB
  - LDO regulators for clean analog power
- **Relevant for us because:** This is the architecture we should build.

---

## Architecture Patterns Summary

### Recording chain (consistent across all top designs):
```
Electrodes → ESD Protection → ADS1299 (PGA + ADC) → SPI → MCU → USB
                                    ↑
                              VREF (internal or external)
                              AVDD/DVDD (separate analog/digital power)
```

### Stimulation chain (from Stimjim):
```
MCU → SPI → DAC → Voltage-to-Current (Howland Pump) → Electrode
                         ↑
                    Precision Rsense for current feedback
```

### Power architecture (from TI reference):
```
USB 5V → LDO 3.3V (digital) → DVDD
       → LDO 3.3V (analog)  → AVDD
       → LDO ±2.5V or ±5V   → Stimulation op-amps (bipolar supply)
```

---

## Extracted Component Lists

| Component | Part Number | Function | Used In | LCSC Likely? |
|-----------|-------------|----------|---------|-------------|
| 8ch 24-bit bio ADC | ADS1299IPAG | Recording front-end + ADC | OpenBCI, TI reference | ✅ Yes |
| MCU | ESP32-S3 | Control, USB, processing | (our choice) | ✅ Yes |
| 4ch 16-bit DAC | DAC8564ICPW | Stimulation waveform gen | (our choice) | ✅ Yes |
| Precision quad op-amp | OPA4188AIDR | Howland current pump | Stimjim-derived | ✅ Yes |
| LDO 3.3V (digital) | AMS1117-3.3 | Digital power | Common | ✅ Basic |
| LDO 3.3V (analog) | TLV71333PDBVR | Low-noise analog power | TI reference | ✅ Yes |
| Reference voltage | Internal ADS1299 | ADC reference | ADS1299 built-in | N/A |
| ESD protection | PRTR5V0U2X | Input protection | TI reference, OpenBCI | ✅ Yes |
| Electrode connector | 2.54mm headers or JST | Electrode interface | All | ✅ Basic |
| USB-C connector | USB-C 16pin | Power + data | (our choice) | ✅ Basic |
| Crystal | 8.192 MHz | ADS1299 clock | TI reference | ✅ Basic |

---

## Recommended Approach

Based on the research, here is the recommended architecture for the **Mycelium Sensor/Stim Board v1**:

### Core architecture:
1. **Recording:** ADS1299IPAG (8ch, 24-bit, built-in PGA) — single chip handles everything
2. **Stimulation:** 4ch DAC (DAC8564 or MCP4728) → Howland current pump (OPA4188 quad op-amp) → electrodes
3. **MCU:** ESP32-S3 (USB native, WiFi/BLE, well-supported, available on LCSC)
4. **Power:** Separate analog/digital LDOs from USB 5V, bipolar supply for stim op-amps
5. **Interface:** USB-C for power + data to host PC

### Why this architecture:
- **ADS1299 is proven** for this exact signal range (µV, DC-coupled, 24-bit) — used by OpenBCI with thousands of validated builds
- **Howland pump** from Stimjim is the standard for precision current stimulation in neuroscience
- **ESP32-S3** has native USB, plenty of SPI peripherals, and WiFi for optional wireless — all available on LCSC
- **Single board** keeps it simple and eliminates inter-board noise coupling issues

### Critical design considerations:
- **DC coupling** — must NOT add AC coupling caps on recording inputs (our signals are sub-Hz)
- **Analog/digital ground separation** — ADS1299 requires careful ground plane management
- **Faraday shielding** — the board should be used inside a Faraday cage (per Mishra 2024)
- **Stimulation isolation** — recording and stimulation grounds should be carefully managed to avoid crosstalk
- **Input protection** — ESD on all electrode inputs (mycelium plates are handled manually)
