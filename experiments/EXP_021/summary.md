# EXP_021: Front Panel Mapping — Cryptographic Beings Controller Box

**Start Date:** 2026-04-28
**Status:** In progress (scoping)
**Airtable Links:** None
**Project:** Cryptographic Beings
**Parent:** EXP_020 (W01–W16 cable continuity), EXP_004 (L↔p bridge mapping)
**Hardware:** Arduino Mega 2560 rig (same as EXP_004/020) + Cryptographic Beings controller box

---

## Overview

The controller box has two physical panels:

- **Back panel** — power input + regulated rails (e.g. 12 V on backpanel ports 1 & 2, see [`controller_backpanel.md`](../../projects/cryptographic_beings/knowledge/controller_backpanel.md))
- **Front panel** — connectors `C01`–`C16` (and possibly more), one per controller cable `W01`–`W16`

We've validated the W01–W16 cables themselves (EXP_020 → all clean identity wiring) and we already know each L-side function (the L↔p assignments are recorded in [`p_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/p_connector_assignments.md)). What we **don't** have yet is a clean map of the **front-panel C connectors**: for each `C##`, we want to know

1. **Connector type** (Aviator GX16-4, M12, M8, …)
2. **Number of wires actively used** (matches W## wire count from EXP_020)
3. **Function** — what subsystem this drives (linear actuator, limit switch, light, LED rail, sensor, …)
4. **Pin assignment per signal** — for each pin on the C connector: which signal (e.g. STEP, DIR, ENABLE, GND, +V, switch-A, switch-B)
5. **Where each pin lands inside the box** — driver / Arduino / PCB pad / power rail

With this mapping in place, the chain `C## → W## → L## → P## → device` is fully documented end-to-end, which is the prerequisite for any future controller-box rebuild or driver swap.

## Goal

Produce a single per-`C##` table covering the five questions above, validated electrically (not just from photos), so the controller harness is unambiguous.

## Method (proposed — not yet confirmed)

> Open question: confirm or change before any scripts are written.

**Option A — physical inspection + electrical probe**
1. Photograph and label the front panel.
2. For each `C##`, identify connector type by sight (Aviator/M12/M8).
3. Cross-reference EXP_020 wire count for each `W##` to predict active pins.
4. With the controller box opened: trace each `C##` pin internally (multimeter beep test from the C-pin to driver/Arduino pad) and record where it lands.
5. Reuse the existing L↔p function mapping (via `W##` → `L##`) to back-fill the function column.

**Option B — Arduino-rig continuity scan from C side to a known reference**
- Plug the EXP_020 rig into each `C##` and probe known points internally (drivers, Arduino pins). Useful if the box is sealed and we don't want to disassemble.

**Option C — pure documentation pass**
- If the wiring is fully documented in another file (schematic / KiCAD / design notes), we just consolidate without electrical testing.

## Known facts so far

| C connector | Function | Source |
|-------------|----------|--------|
| **C03** | 220 V relay output | User, 2026-04-28 |
| **C05** | 220 V relay output | User, 2026-04-28 |
| **C06** | 220 V relay output | User, 2026-04-28 |
| **C07** | 220 V relay output | User, 2026-04-28 |
| **C08** | 220 V relay output | User, 2026-04-28 |

Five 220 V relays total — matches the count of five 220 V loads on the installation side (one per level).

### ⚠ Conflict to resolve with [`p_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/p_connector_assignments.md)

If we trust `cables.csv` (W## connects C## ↔ L##) and the existing L↔p mapping, the C-side function should follow from L→p→function. Cross-checking the user's five 220 V C connectors against that chain:

| C | → L (via cables.csv) | → p (via p_connector_assignments) | Documented function | Match? |
|---|---|---|---|---|
| C03 | L03 | p9 | Level 5 220 V Gated Light | ✅ 220 V — consistent |
| C05 | L05 | p4 | Level 2 220 V Gated Light | ✅ 220 V — consistent |
| C06 | L06 | p11 | Rotating LED gated power BOTTOM | ⚠ documented as LED, but may be a 220 V relay feeding an LED driver |
| C07 | L07 | p10 | Rotating LED gated power TOP | ⚠ same as above |
| C08 | L08 | p17 | **24 V input** to power central PCBs + motor | ❌ documented as 24 V *input* power, conflicts with "220 V relay output" |

Three possibilities for the conflicts at C06/C07/C08:

1. **The relays do switch 220 V**, but downstream of the front panel that 220 V feeds an LED driver (C06/C07) or a 24 V PSU (C08). In this case both descriptions are correct at different points along the chain — the front panel is "220 V relay output" and `p_connector_assignments.md` is naming the *load* the rail eventually drives.
2. **The C↔L numerical mapping in `cables.csv` is nominal, not physical** — the cables may be plugged in different positions than their labels suggest, in which case `C08` does not actually go to `L08`.
3. **`p_connector_assignments.md` is mislabeled** for these entries.

Only #1 is consistent with the user being right *and* the existing docs being right. The other two would require a correction somewhere. Need to confirm before locking the C-side table.

## Progress

### Phase 1: Scoping ⏳
- [x] Create experiment folder + 4 required docs
- [x] Capture first known fact (220 V relays on positions 3, 5, 6, 7, 8)
- [ ] **User confirms scope and method** (Option A / B / C)
- [ ] Resolve ambiguity: front-panel position numbers ↔ `C##` labels

### Phase 2: Mapping 🔲
- [ ] Photograph + label the front panel
- [ ] Per-`C##` table populated for connector type, wire count, function
- [ ] Per-`C##` pin-to-signal table

### Phase 3: Validation 🔲
- [ ] Electrical confirmation of pin assignments
- [ ] Save final results to `results/`

## Results

_No results yet._

## References

- [EXP_020](../EXP_020/summary.md) — W01–W16 cable continuity (one end of each W is the C side)
- [EXP_004](../EXP_004/summary.md) — L↔p bridge mapping
- [`p_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/p_connector_assignments.md) — what each P (and by extension L, W, C) connector drives
- [`cable_labeling.md`](../../projects/cryptographic_beings/knowledge/cable_labeling.md) — naming convention
- [`controller_backpanel.md`](../../projects/cryptographic_beings/knowledge/controller_backpanel.md) — backpanel ports (separate from C##)
