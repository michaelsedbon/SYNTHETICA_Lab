# EXP_020: Controller Cable Continuity Mapping (W01–W16)

**Start Date:** 2026-04-27
**Status:** Complete (16/16 cables scanned 2026-04-27)
**Airtable Links:** None
**Project:** Cryptographic Beings
**Parent:** EXP_004
**Hardware:** Arduino Mega 2560 (same rig as EXP_004 — no reflash)

---

## Overview

Per-cable continuity test for the 16 controller-internal cables `W01`–`W16`. Each cable has a `C##` connector on one end and an `L##` connector on the other, soldered up by hand. We need to know, for each physical cable:

1. **How many wires are actually soldered through** (compared against the user's intuition / expected count, to flag bad solder joints or missed wires).
2. **The pin-to-pin map** — which pin on connector `C##` lands on which pin on connector `L##`.

The naming convention is documented in [cable_labeling.md](../../projects/cryptographic_beings/knowledge/cable_labeling.md): every cable has a unique `W##` and end labels of the form `W##-{connector_code}`.

## Hardware Setup

Same Arduino Mega rig as EXP_004 — **no firmware change**, no re-wiring of the test pigtails:

| Side | Arduino Pins | Cable end being tested |
|------|--------------|------------------------|
| End A — output (drives LOW) | D22, D23, D24, D25 | `C##` end (controller side) |
| End B — input (INPUT_PULLUP) | D38, D39, D40, D41 | `L##` end (L-panel aviator) |

Firmware: `experiments/EXP_004/firmware/src/main.cpp` v3.0 (full 4×4 cross-scan, 115200 baud, JSON protocol).

## Web App

`webapp/index.html` — single-file HTML app (open in Chrome/Edge with Web Serial support).

### Workflow per cable

1. App loads `cables.csv` (from the project) and filters to `family = controller` (W01–W16).
2. User picks the next un-scanned cable from the dropdown — header shows both end labels.
3. User enters their **expected wire count** (intuition).
4. Plug both ends into the test rig.
5. Click **Start Scanning** — beep on continuity.
6. App displays detected pin-to-pin map and **flags discrepancy** if detected ≠ expected.
7. **Confirm & save** — appends record to `webapp/results/cable_continuity.json`, auto-advances.

### Output schema

The C/L identity of each end is **not assumed** at scan time — we just measure A↔B internal connectivity. Connector identity is derived later from the pin map.

```json
{
  "wire_number": "W01",
  "expected_wires": 4,
  "detected_wires": 4,
  "bridges": 0,
  "discrepancy": false,
  "pin_map": {
    "a1": [4],
    "a2": [3],
    "a3": [2],
    "a4": [1]
  },
  "scanned_at": "2026-04-27T14:32:01Z",
  "notes": ""
}
```

## Goal

Get a clean, validated pin-to-pin map for every C↔L cable so the controller harness can be built/verified without surprises.

## Progress

### Phase 1: Setup ✅
- [x] Create experiment folder + 4 required docs
- [x] Build webapp (duplicated from EXP_004 with continuity-test UX)
- [x] First test pass on W01 (revealed M12-side rig wired in reverse — calibrated)

### Phase 2: Scan all 16 cables ✅
- [x] W01–W08
- [x] W09–W16
- [x] All 16 clean — no discrepancies, no bridges, identity pinout

## Results — 2026-04-27

**All 16 cables W01–W16 scanned, all clean.** Every detected wire goes pin-to-pin straight through (A pin N → B pin N), with no bridges and detected count matching expected count for every cable. Wire counts vary by cable as expected.

Snapshots saved to [`results/`](results/):
- [`cable_continuity_2026-04-27.json`](results/cable_continuity_2026-04-27.json) — full records (per-cable pin map, calibration, timestamps)
- [`cable_continuity_2026-04-27.csv`](results/cable_continuity_2026-04-27.csv) — flat table

### Per-cable summary

Calibration applied to every record: side A `[1,2,3,4]` (identity), side B `[3,4,2,1]` (D38→phys 3, D39→phys 4, D40→phys 2, D41→phys 1 — physical wiring of the M12 rig). Cable orientation rule per [`RIG_CONVENTION.md`](RIG_CONVENTION.md): labeled end on Aviator/D22–D25 = side A; unlabeled end on M12/D38–D41 = side B.

| Cable | Wires | Pin map (A→B, physical pins) |
|-------|-------|------------------------------|
| W01 | 3/3 ✓ | A1→B1, A2→B2, A3→B3 |
| W02 | 3/3 ✓ | A1→B1, A2→B2, A3→B3 |
| W03 | 4/4 ✓ | A1→B1, A2→B2, A3→B3, A4→B4 |
| W04 | 4/4 ✓ | A1→B1, A2→B2, A3→B3, A4→B4 |
| W05 | 3/3 ✓ | A1→B1, A2→B2, A3→B3 |
| W06 | 3/3 ✓ | A1→B1, A2→B2, A3→B3 |
| W07 | 4/4 ✓ | A1→B1, A2→B2, A3→B3, A4→B4 |
| W08 | 4/4 ✓ | A1→B1, A2→B2, A3→B3, A4→B4 |
| W09 | 2/2 ✓ | A1→B1, A2→B2 |
| W10 | 2/2 ✓ | A1→B1, A2→B2 |
| W11 | 2/2 ✓ | A1→B1, A2→B2 |
| W12 | 2/2 ✓ | A1→B1, A2→B2 |
| W13 | 4/4 ✓ | A1→B1, A2→B2, A3→B3, A4→B4 |
| W14 | 2/2 ✓ | A1→B1, A2→B2 |
| W15 | 2/2 ✓ | A1→B1, A2→B2 |
| W16 | 2/2 ✓ | A1→B1, A2→B2 |

### Wire-count distribution

- **5 cables with 4 wires:** W03, W04, W07, W08, W13
- **4 cables with 3 wires:** W01, W02, W05, W06
- **7 cables with 2 wires:** W09, W10, W11, W12, W14, W15, W16

### Observations

- All cables wired identity (no swaps, no crossovers, no bridges) — clean harness.
- Wire-count variation across cables is intentional / pre-existing; all 16 match the user's expected count per cable.
- The C and L connector identities for each end follow from the orientation rule (labeled end = C side); the cables.csv mapping `W01-C01 ↔ W01-L01` etc. is consistent with a single labeled end being on the controller (C) side.

## References

- EXP_004 — original connector mapping (L↔p bridge cables). Same firmware, same hardware.
- [`projects/cryptographic_beings/knowledge/cable_labeling.md`](../../projects/cryptographic_beings/knowledge/cable_labeling.md) — naming convention.
- [`projects/cryptographic_beings/cables/cables.csv`](../../projects/cryptographic_beings/cables/cables.csv) — registry of all 50 cables.
