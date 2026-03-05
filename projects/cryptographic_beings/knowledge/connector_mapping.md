# Connector Mapping — Cryptographic Beings Machine

**Date discovered:** 2026-03-04
**Source experiment:** [EXP_004](../../experiments/EXP_004/summary.md)

---

## Architecture

The machine has two connection plates:
- **Controller Plate** — 16× GX16-4 Aviator connectors (labeled L1–L16)
- **Installation Plate** — 18× M12/M8 connectors (labeled p1–p18)

Each cable connects one L connector to one p position. The mapping is not sequential — it was discovered experimentally using an Arduino Mega cross-scan.

## Connector Types & Pin Wiring

| Connector Side | Type | Pin 1 | Pin 2 | Pin 3 | Pin 4 |
|---------------|------|-------|-------|-------|-------|
| Controller | Aviator GX16-4 | Red | Black | White | Blue |
| Installation (M12) | M12 4-pin | White | Blue | Black | Red |
| Installation (M8) | M8 4-pin | Blue | Black | White | Red |

## Full Mapping Table (2026-03-04)

13 of 16 L connectors mapped. Only L16→p2 has a clean 4/4 wire mapping.

| L (Controller) | p (Installation) | Wires Connected | Pin Mapping |
|---|---|---|---|
| L1 | p5 | 2/4 | avi1→m4, avi2→m2+m3 |
| L2 | p6 | 1/4 | avi1→m4 |
| L4 | p3 | 2/4 | avi1→m4, avi2→m2+m3 |
| L5 | p4 | 2/4 | avi1→m4, avi2→m2+m3 |
| L6 | p11 | 2/4 | avi1→m4, avi2→m2+m3 |
| L7 | p10 | 2/4 | avi1→m4, avi2→m2+m3 |
| L8 | p17 | 2/4 | avi1→m4, avi2→m2+m3 |
| L10 | p9 | 3/4 | avi1→m4, avi2→m1, avi3→m2+m3 |
| L11 | p15 | 3/4 | avi1→m4, avi2→m1, avi3→m2 |
| L12 | p16 | 3/4 | avi1→m4, avi2→m1, avi3→m2 |
| L14 | p8 | 3/4 | avi1→m4, avi2→m2+m3, avi4→m1 |
| L15 | p12 | 3/4 | avi1→m2+m3, avi2→m1, avi3→m4 |
| L16 | p2 | 4/4 ✅ | avi1→m4, avi2→m3, avi3→m2, avi4→m1 |

### Unmapped

- **L connectors not found:** L3, L9, L13
- **p positions not matched:** p1, p7, p13, p14, p18

## Key Observations

1. **Common pattern:** `avi_pin1 → m_pin4` appears in 12 of 13 mappings (L15 is the exception)
2. **Bridged pins:** `m_pin2 + m_pin3` are often shorted together on the installation side
3. **L2→p6 is suspect:** Only 1 wire connected — cable may be damaged
4. **L16→p2 is the only fully wired cable** (4/4 pins mapped cleanly)

## Motor Wiring — Slewing Bearing (Up/Down)

**Motor:** StepperOnline 23HP22-2804S (NEMA 23, bipolar, 2.8A, 1.20 Nm)
**Driver:** Yundan DM556
**Date wired:** 2026-03-05

### Motor → M12 Connector Soldering

| M12 Pin | M12 Wire Colour | Motor Wire | Phase |
|---------|----------------|------------|-------|
| Pin 1 | White | **Black** | A+ |
| Pin 2 | Blue | **Green** | A- |
| Pin 3 | Black | **Red** | B+ |
| Pin 4 | Red | **Blue** | B- |

> If motor direction is inverted, swap pins 1 & 2 (or 3 & 4) to reverse one coil.

---

## Raw Data

Full JSON export: [`experiments/EXP_004/webapp/connectome/connector_mapping_2026-03-04 (3).json`](../../experiments/EXP_004/webapp/connectome/connector_mapping_2026-03-04%20(3).json)
