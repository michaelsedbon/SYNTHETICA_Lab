# EXP_020 — Rig Connection Convention

**Established:** 2026-04-27

This is the fixed orientation for plugging W## cables into the Arduino test rig. Hold to it for every cable so all results are comparable.

---

## Cable orientation rule

Every W## cable has **two ends**. One of them carries a label sticker with the cable number (e.g. `W01`). That labeled end is the side that was previously soldered to the **old controller box**.

| Cable end | Plug into | Arduino pins |
|-----------|-----------|--------------|
| **Labeled end** (had the sticker / was on the old controller box) | **Aviator side** of the rig | D22, D23, D24, D25 (= "Side A" / output) |
| **Unlabeled end** (the other side) | **M12 side** of the rig | D38, D39, D40, D41 (= "Side B" / input) |

So in every saved record, "side A" = labeled end / old-controller-side, and "side B" = unlabeled end / installation-side.

---

## Why this matters

If we don't keep this convention consistent, the `pin_map` becomes ambiguous — you can't tell whether `A pin 2 → B pin 3` means "labeled-end pin 2 → other-end pin 3" or the reverse. With this rule fixed, the meaning is unambiguous across all 16 cables.

## Calibration note

The rig's alligator-clip wiring is **not** identity on the M12 side. As of 2026-04-27 the calibration that maps Arduino-pin ↔ physical-connector-pin is:

| Side A — Aviator (output) | Side B — M12 (input) |
|---------------------------|----------------------|
| D22 → phys 1 | D38 → phys 4 |
| D23 → phys 2 | D39 → phys 3 |
| D24 → phys 3 | D40 → phys 2 |
| D25 → phys 4 | D41 → phys 1 |

Side A is identity. Side B is reversed (1↔4, 2↔3) because the M12 alligator clips were wired to the connector pins in reverse order. The webapp persists this in `localStorage` (`exp020_remap`); it is also stamped into every saved record under `rig_calibration`.

If the rig is ever rewired, recalibrate by jumpering D22 to physical pin 1 of the M12 socket and reading which input slot fires; repeat for each pin.
