# Component Sourcing Report — EXP_009 Driver Board

## Summary
- Total unique parts: 14 types
- Basic parts: 10 ($0 assembly fee each)
- Extended parts: 4 (~$3 assembly fee each)
- Not on JLCPCB: 0
- Estimated BOM cost per board: ~$26 (at qty 5)
- Estimated assembly cost: ~$15 + $12 extended parts fee

## Sourcing Decisions

### ESP32-S3-WROOM-1 — Extended
- **LCSC:** C2913202 (N16R8 variant, 16MB flash + 8MB PSRAM)
- **Same part used in EXP_008** — pin-compatible, proven in existing designs

### PCA9685PW — Extended
- **LCSC:** C150292 (PCA9685PW,118)
- **Stock:** ~500 units, NXP original
- **Note:** TSSOP-28 requires reflow or careful hand soldering

### DRV8870DDAR — Extended (×8)
- **LCSC:** C86590
- **Stock:** ~3000 units
- **Note:** Largest BOM cost driver (8 × $1.95 = $15.60)

### AMS1117-3.3 — Basic
- **LCSC:** C6186
- **Stock:** 50,000+, very common, same part as EXP_008

### Passives — All Basic
- All resistors and capacitors use pre-validated JLCPCB basic parts
- 0.2Ω current sense: C270291 (0805, 1%)

## Cost Breakdown

| Block | Parts | BOM Cost |
|-------|-------|----------|
| MCU | 1 | $4.48 |
| PWM Controller | 1 | $1.85 |
| Drivers (×8) | 8 | $15.60 |
| Power (LDO) | 1 | $0.07 |
| Passives | ~20 | $0.15 |
| Connectors | 11 | $1.18 |
| Switches | 2 | $0.10 |
| **Total** | **~44** | **~$23.43** |
