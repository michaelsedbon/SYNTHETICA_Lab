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
