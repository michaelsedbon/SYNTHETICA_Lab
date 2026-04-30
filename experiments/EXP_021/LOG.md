# EXP_021 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-04-28 — Experiment Created

- Initialised experiment folder with the 4 required doc files.
- Goal: produce a complete per-`C##` mapping of the front panel of the Cryptographic Beings controller box (connector type, active wire count, function, pin assignments, and internal landing point).
- Chain context: EXP_020 validated the W01–W16 cables themselves; this experiment characterises the C-side endpoints those cables plug into.
- Awaiting user confirmation on method (Option A: open box + multimeter trace, Option B: Arduino-rig continuity scan from C side, Option C: pure doc consolidation).

## 2026-04-28 — First known fact: 220 V relays

- User: front-panel ports **3, 5, 6, 7, 8** are connected to relays that switch **220 V**.
- Clarified: these are **C-labeled connectors** → `C03`, `C05`, `C06`, `C07`, `C08`.
- Cross-check: matches the count of 220 V gated lights documented in [`p_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/p_connector_assignments.md) (5 levels × 220 V each).
- Apparent conflicts (logged in [`summary.md`](summary.md) and [`c_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/c_connector_assignments.md)): C06/C07 documented as "Rotating LED gated power" and C08 as "24 V input"; these may actually be 220 V upstream of LED drivers/PSUs, or there's a label mismatch to resolve.
- **Created [`c_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/c_connector_assignments.md)** as the canonical living record of the front-panel mapping (parallel to `p_connector_assignments.md`). Will be updated as EXP_021 fills in more entries.

## 2026-04-29 — `W##/C##/L##` numbering is independent

- User clarified: the matching numerical labels in `cables.csv` (e.g. `W01-C01 / W01-L01`) are **placeholders, not physical mappings**. Each W cable's two endpoints are determined empirically.
- Implication: dropped all "via cables.csv → L##→p##" inferences from `c_connector_assignments.md`. The doc now lists only confirmed mappings.
- First confirmed mapping recorded: **`W03` connects `C15` (front panel) ↔ `L16` (L panel)** — the 4-wire DM556 STEP/DIR signal path for `MOTOR_1` (linear actuator bottom). Continues through `W32` → `p2` → motor.

## 2026-04-30 — MOTOR_1 limit-sensor cable mapped

- Established: **`W01` connects `C16` (front panel) ↔ `L10` (L panel)** — 3-wire NPN-NO sensor signal path for the LJ8A3-2-Z/BX limit switch on `MOTOR_1`. Continues through `W26` → `p1` → sensor.
- Updated [`cables.csv`](../../projects/cryptographic_beings/cables/cables.csv) (W01 + W03 rows now reflect the real endpoints, status flipped to `validated`).
- Updated [`c_connector_assignments.md`](../../projects/cryptographic_beings/knowledge/c_connector_assignments.md) with both confirmed mappings.
- This completes the wiring documentation for `MOTOR_1`: drive signals on `C15`, sensor return on `C16`. Together they're the full I/O of the bottom linear actuator from the controller-box front panel.
