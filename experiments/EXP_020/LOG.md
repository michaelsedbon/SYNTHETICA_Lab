# EXP_020 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-04-27 — Experiment Created

- Initialised experiment folder from EXP_004 (parent).
- Goal: scan all 16 controller cables `W01`–`W16` and record per-cable pin-to-pin continuity, with user-supplied expected wire count to flag discrepancies.
- Reusing EXP_004 Arduino Mega firmware (full 4×4 cross-scan) — no reflash, no re-wiring.
- New webapp duplicated from EXP_004 with continuity-test UX (cable dropdown driven by `cables.csv`).

## 2026-04-27 — Rig calibration & cable orientation rule

- Added Rig Calibration UI (Arduino pin ↔ physical pin remap, persisted in `localStorage`).
- First W01 scan + multimeter cross-check revealed the M12 side of the rig is wired in reverse (alligator clips on D38/D39/D40/D41 land on physical pins 4/3/2/1 of the M12 connector).
- Established cable orientation convention (see [`RIG_CONVENTION.md`](RIG_CONVENTION.md)): the **labeled end** of each cable (the end that was on the old controller box) always plugs into the Aviator side (D22–D25); the unlabeled end plugs into the M12 side (D38–D41). All `pin_map` records use this orientation.

## 2026-04-27 — All 16 cables scanned ✅

- Full pass of W01–W16 complete in a single session.
- **Result: all 16 cables wired identity, no discrepancies, no bridges.** Detected wire count matches expected for every cable.
- Wire-count distribution: 5×4-wire (W03/04/07/08/13), 4×3-wire (W01/02/05/06), 7×2-wire (W09/10/11/12/14/15/16).
- Snapshotted live JSON + generated flat CSV under [`results/`](results/) (`cable_continuity_2026-04-27.{json,csv}`).
- Summary table added to [`summary.md`](summary.md). Status flipped to Complete.
