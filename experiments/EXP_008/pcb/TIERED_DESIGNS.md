# Tiered Design Proposals — Mycelium Sensor/Stim Board

## Functional Block Diagram

```
                    ┌─────────────────────────────────────┐
   8× Recording    │         RECORDING PATH               │
   Electrodes ─────┤  ESD → ADS1299 (PGA+MUX+ADC) → SPI  │──┐
                    └─────────────────────────────────────┘  │
                                                              │
                    ┌─────────────────────────────────────┐  │    ┌──────────────┐
   4× Stim         │         STIMULATION PATH              │  ├───→│              │
   Electrodes ←────┤  Howland Pump ← Op-Amp ← DAC ← SPI   │──┘    │   ESP32-S3   │──→ USB-C
                    └─────────────────────────────────────┘  ←────│   (MCU)       │
                                                                    │              │
                    ┌─────────────────────────────────────┐        └──────────────┘
                    │         POWER                         │              ↑
   USB 5V ─────────┤  LDO 3.3V (dig) + LDO 3.3V (ana)     │──────────────┘
                    │  + Bipolar ±5V (stim op-amps)         │
                    └─────────────────────────────────────┘
```

---

## Block Specifications

### Block 1: Electrode Interface
- **Purpose:** Connect sterile needle electrodes to the board
- **Key specs:** 8× recording inputs (differential pairs), 4× stimulation outputs, 1× ground
- **Interface:** 2.54mm pin headers or JST connectors
- **Protection:** ESD diodes (PRTR5V0U2X or TVS) on all electrode pins

### Block 2: Recording ADC (ADS1299)
- **Purpose:** Amplify and digitise µV-range extracellular potentials
- **Key specs:** 24-bit, 250 SPS max, ≤1 µVpp input noise, PGA gain 1–24×, DC-coupled
- **Interface:** SPI (SCLK, DIN, DOUT, CS, DRDY, START, RESET, PWDN) to MCU
- **Power:** AVDD = 5V (internal LDO from DVDD), DVDD = 3.3V
- **Critical:** Must NOT AC-couple inputs (sub-Hz signals)

### Block 3: Stimulation Circuit
- **Purpose:** Deliver programmable constant-current pulses to mycelium (0–200 µA)
- **Key specs:** 4 independent channels, biphasic capable, µA resolution
- **Architecture:** DAC output → Improved Howland current pump → electrode
- **Interface:** SPI or I²C from MCU to DAC

### Block 4: MCU
- **Purpose:** Control ADS1299 + DAC via SPI, stream data to PC via USB
- **Key specs:** Dual SPI, USB native, 240 MHz, WiFi/BLE optional
- **Interface:** USB-C to PC, SPI to recording + stimulation

### Block 5: Power Supply
- **Purpose:** Generate clean analog + digital rails from USB 5V
- **Key specs:** AVDD 3.3V (low noise, <20 µVrms), DVDD 3.3V, ±5V for op-amps
- **Interface:** USB-C 5V input
- **Critical:** Separate analog/digital LDOs, adequate decoupling

---

## Design Tiers

### Tier 1: "Proof of Concept" — 4 rec + 0 stim, ~$42

The minimum viable board. Recording only, no stimulation. Uses the ADS1299 but only populates 4 of the 8 inputs. Perfect for validating the recording chain against your existing PicoLog ADC-24 setup.

**Key changes from Tier 2:**
- Only 4 recording channels populated (half the electrode connectors)
- No stimulation circuit (no DAC, no op-amps, no stim connectors)
- Simpler power (no bipolar supply)
- Same ADS1299 — you pay for 8 channels but only use 4

**Components:**
- ADS1299IPAGR × 1 (~$31)
- ESP32-S3-WROOM-1-N4 × 1 (~$3.25)
- AMS1117-3.3 (power) × 1 (~$0.10)
- TLV71333PDBVR (analog LDO) × 1 (~$0.50)
- Passives + connectors (~$7)

| Spec | Value |
|------|-------|
| Recording | 4 ch |
| Stimulation | None |
| BOM estimate | ~$42 |
| PCB layers | 2 |
| Assembly | 2/5 (TQFP-64 needs reflow) |
| Board size | ~40×50 mm |

---

### Tier 2: "Explorer" — 8 rec + 4 stim, ~$65 ⭐ RECOMMENDED

The sweet spot. Full 8-channel recording with 4 independent stimulation channels. Matches your target spec exactly. Good enough for early MyceliumBrain experiments.

**Components:**
- ADS1299IPAGR × 1 (~$31) — full 8ch recording
- DAC8564IAPW × 1 (~$11) — 4ch 16-bit DAC for stimulation
- OPA4188AIPWR × 1 (~$1.78) — quad op-amp for 4× Howland pumps
- ESP32-S3-WROOM-1-N4 × 1 (~$3.25)
- TPS65131RGER × 1 (~$2.50) — bipolar ±5V supply for op-amps
- AMS1117-3.3 + TLV71333 (~$0.60) — digital + analog LDOs
- Passives + connectors (~$15)

| Spec | Value |
|------|-------|
| Recording | 8 ch (24-bit, <1 µV noise) |
| Stimulation | 4 ch (0–200 µA, 16-bit resolution) |
| BOM estimate | ~$65 |
| PCB layers | 4 (recommended for analog/digital separation) |
| Assembly | 3/5 (TQFP-64 + TSSOP) |
| Board size | ~50×60 mm |

---

### Tier 3: "Research" — 16 rec + 8 stim, ~$120

Double the channels. Two ADS1299 chips in daisy-chain mode (supported by the chip's built-in daisy-chain feature). 8 stimulation channels using 2× DAC + 2× quad op-amp.

**Key changes from Tier 2:**
- 2× ADS1299 in daisy chain (doubles recording to 16ch)
- 2× DAC8564 + 2× OPA4188 (doubles stimulation to 8ch)
- Same ESP32-S3 MCU handles everything via SPI
- 4-layer PCB required for routing density
- Larger board footprint

**Components:**
- ADS1299IPAGR × 2 (~$62)
- DAC8564IAPW × 2 (~$22)
- OPA4188AIPWR × 2 (~$3.56)
- ESP32-S3-WROOM-1-N4 × 1 (~$3.25)
- TPS65131RGER × 1 (~$2.50)
- AMS1117-3.3 + TLV71333 (~$0.60)
- Passives + connectors (~$26)

| Spec | Value |
|------|-------|
| Recording | 16 ch |
| Stimulation | 8 ch |
| BOM estimate | ~$120 |
| PCB layers | 4 |
| Assembly | 3/5 |
| Board size | ~60×80 mm |

---

### Tier 4: "Dense Grid" — 32 rec + 16 stim, ~$225

Full grid coverage for spatial mapping. Four ADS1299 chips in daisy chain. 16 stimulation channels from 4× DAC + 4× quad op-amp. Suitable for the full MyceliumBrain DishBrain-style closed-loop experiments.

**Key changes from Tier 3:**
- 4× ADS1299 in daisy chain (32ch recording)
- 4× DAC8564 + 4× OPA4188 (16ch stimulation)
- Requires careful SPI bus management
- 4-layer or 6-layer PCB
- Significantly larger board
- May need dedicated FPGA or STM32H7 instead of ESP32 for data throughput

**Components:**
- ADS1299IPAGR × 4 (~$124)
- DAC8564IAPW × 4 (~$44)
- OPA4188AIPWR × 4 (~$7.12)
- ESP32-S3-WROOM-1-N8 × 1 (~$4) (or STM32H743 for higher throughput)
- TPS65131RGER × 1 (~$2.50)
- AMS1117-3.3 + TLV71333 (~$0.60)
- Passives + connectors (~$43)

| Spec | Value |
|------|-------|
| Recording | 32 ch |
| Stimulation | 16 ch |
| BOM estimate | ~$225 |
| PCB layers | 4–6 |
| Assembly | 4/5 |
| Board size | ~80×100 mm |

---

## Tier Comparison

| Feature | Tier 1: PoC | Tier 2: Explorer ⭐ | Tier 3: Research | Tier 4: Dense Grid |
|---------|-------------|---------------------|------------------|--------------------|
| Recording channels | 4 | 8 | 16 | 32 |
| Stimulation channels | 0 | 4 | 8 | 16 |
| ADC resolution | 24-bit | 24-bit | 24-bit | 24-bit |
| Input noise | <1 µVpp | <1 µVpp | <1 µVpp | <1 µVpp |
| Stim range | — | 0–200 µA | 0–200 µA | 0–200 µA |
| ADS1299 count | 1 | 1 | 2 | 4 |
| DAC count | 0 | 1 | 2 | 4 |
| Op-amp count | 0 | 1 (quad) | 2 (quad) | 4 (quad) |
| MCU | ESP32-S3 | ESP32-S3 | ESP32-S3 | ESP32-S3 / STM32H7 |
| Est. BOM (per board) | ~$42 | ~$65 | ~$120 | ~$225 |
| JLCPCB assembly fee | ~$15 | ~$25 | ~$35 | ~$55 |
| PCB layers | 2 | 4 | 4 | 4–6 |
| Board size (mm) | 40×50 | 50×60 | 60×80 | 80×100 |
| Assembly complexity | 2/5 | 3/5 | 3/5 | 4/5 |
| Best for | Validate chain | First experiments | Spatial mapping | DishBrain-style |

---

## Recommendation

**Start with Tier 2 ("Explorer")** — it matches your stated target (8rec + 4stim), hits the sweet spot between capability and cost at ~$65/board, and uses the same architecture that scales to Tiers 3–4 if you need more channels later. The ADS1299 daisy-chain feature means upgrading to 16 or 32 channels is just adding more chips on the same SPI bus — no architectural redesign needed.

The board layout for Tier 2 can even be designed with **expansion headers** so you could plug in a daughter board with additional ADS1299 + DAC chips later, without redesigning the main board.
