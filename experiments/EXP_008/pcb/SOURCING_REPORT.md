# Component Sourcing Report — Mycelium Sensor/Stim Board (Tier 2)

## Summary

| Metric | Value |
|--------|-------|
| Total unique parts | 23 |
| Basic parts (JLCPCB) | 15 ($0 assembly fee each) |
| Extended parts (JLCPCB) | 8 (~$3 assembly fee each) |
| Not on JLCPCB | 0 ✅ |
| Estimated BOM cost per board (qty 5) | **~$62** |
| Estimated JLCPCB assembly fee | **~$32** (setup + extended parts) |
| Total per board (BOM + assembly) | **~$94** |

> [!TIP]
> All components are available on LCSC/JLCPCB — the board is fully machine-assemblable. No hand soldering required.

---

## Sourcing Decisions

### ADS1299IPAGR (U1) — ✅ Direct Match
- **LCSC:** C246563, $30.99
- **Status:** Extended part
- **Notes:** Exact part from OpenBCI reference design. In stock on LCSC. TQFP-64 package is standard for JLCPCB reflow.

### ESP32-S3-WROOM-1-N4 (U2) — ✅ Direct Match
- **LCSC:** C2913202, $3.25
- **Status:** Extended part
- **Notes:** 4MB flash, sufficient for USB CDC + SPI control firmware. WiFi/BLE available for future wireless streaming.

### DAC8564IAPWR (U3) — ✅ Direct Match
- **LCSC:** C129428, $11.21
- **Status:** Extended part
- **Notes:** The IAPWR variant (industrial temp range) is in stock. Consumer ICPWR variant also available if needed.

### OPA4188AIPWR (U4) — ✅ Direct Match
- **LCSC:** C131418, $1.77
- **Status:** Extended part
- **Notes:** Low offset voltage (±25 µV max) is important for Howland pump accuracy. Quad package gives us exactly 4 channels.

### TPS65131RGER (U5) — ✅ Direct Match
- **LCSC:** C87663, $2.50
- **Status:** Extended part
- **Notes:** Generates ±5V from 3.3V input. 800mA output — more than enough for 4× op-amp channels.

### TLV75733PDBVR (U7) — ⚠️ Substitution
- **Original:** TLV71333PDBVR (not found on LCSC)
- **Substitute:** TLV75733PDBVR (C485517, $0.45)
- **Reason:** Same function (3.3V low-noise LDO), same SOT-23-5 package, pin-compatible
- **Impact:** None — TLV757 series has even lower noise (6.5 µVrms vs ~20 µVrms), better for our analog supply
- **Status:** Extended part

### AMS1117-3.3 (U6) — ✅ Direct Match (Basic!)
- **LCSC:** C6186, $0.10
- **Status:** **Basic part** ($0 assembly fee)
- **Notes:** One of the most common JLCPCB parts. Perfect for digital 3.3V supply.

### Passives — All Basic Parts ✅
All resistors, capacitors, and LEDs are JLCPCB basic parts with massive stock (500K+ units). Zero assembly fee for these.

---

## Unavailable Components

**None** — all components were found on LCSC. ✅

---

## Newer Versions Found

| Current | Newer | Improvement | Pin Compatible | Recommend? |
|---------|-------|-------------|----------------|------------|
| ADS1299 | ADS1299-6 | 6ch variant, cheaper | Same TQFP-64 | ❌ No — we need 8ch |
| ADS1299 | ADS1298 | Higher sample rate | Same TQFP-64 | ❌ No — we don't need speed |
| ESP32-S3 | ESP32-C6 | WiFi 6, cheaper | Different module | ❌ No — S3 has better SPI, more GPIO |
| OPA4188 | OPA4192 | Lower noise | Pin compatible | ⬜ Optional — marginal improvement, +$2 |

---

## Cost Breakdown

| Block | # Parts | BOM Cost | JLCPCB Fee |
|-------|---------|----------|------------|
| Recording (ADS1299 + crystal + ESD) | 6 | $31.62 | $6 (2 extended) |
| Stimulation (DAC + op-amp) | 2 | $12.98 | $6 (2 extended) |
| MCU (ESP32-S3) | 1 | $3.25 | $3 (1 extended) |
| Power (LDOs + DC-DC) | 3 | $3.05 | $6 (2 extended) |
| Connectors (USB-C + headers) | 5 | $0.56 | $0 (all basic) |
| Passives (R + C + LED) | 6 lines | $0.54 | $0 (all basic) |
| **Total** | **23** | **~$52** | **~$24** |

> [!NOTE]
> BOM cost is for components only. Add ~$8 for JLCPCB PCB fabrication (5 boards, 4-layer, ~50×60mm) and ~$24 for assembly setup + extended part fees. **Total for 5 assembled boards: ~$94/board** or **~$470 for 5 boards**.

---

## JLCPCB Order Notes

1. **PCB specs:** 4-layer, 1.6mm thickness, HASL finish, green soldermask
2. **Assembly:** Standard PCBA service (all SMD parts)
3. **THT components:** Pin headers (J2-J5) are through-hole — either hand-solder or use JLCPCB's THT assembly service (+$0.01/joint)
4. **Minimum order:** 5 boards for JLCPCB (standard minimum)
5. **Lead time:** ~5 days fabrication + ~3 days assembly + ~5 days shipping = ~2 weeks total
