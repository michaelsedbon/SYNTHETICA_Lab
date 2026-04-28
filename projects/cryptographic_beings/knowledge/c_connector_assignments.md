# C Connector Assignments — Cryptographic Beings Front Panel

**Source:** [EXP_021](../../experiments/EXP_021/summary.md) (front-panel mapping, in progress)
**Started:** 2026-04-28

This is the mapping of the **front-panel `C##` connectors** of the controller box. The back panel is documented separately in [`controller_backpanel.md`](controller_backpanel.md). The chain is:

```
C## (front panel)  ──W##──▶  L## (panel)  ──W(17–32)──▶  p## (installation)  ──W(33+)──▶  device
```

EXP_020 validated W01–W16 with clean identity pinout, so each `C##` carries the same wires as its matching `L##` (subject to the labeling convention being physically correct — see open question below).

---

## Known assignments

| C connector | Function | Cable | Wire count (EXP_020) | Cross-ref (via L↔p) | Confidence | Source |
|-------------|----------|-------|----------------------|---------------------|------------|--------|
| **C01** | _unknown_ | W01 | 3/4 | L1 → p5 → Level 3 220 V Gated Light | low | inferred |
| **C02** | _unknown_ | W02 | 3/4 | L2 → p6 → Level 4 220 V Gated Light | low | inferred |
| C03 | 220 V per-level light (level TBD) | W03 | 4/4 | L3 → p9 → 220 V (per old doc, channel→level pending) | medium (driven by LIGHTS_1) | user 2026-04-28 |
| **C04** | _unknown_ | W04 | 4/4 | L4 → p3 → Level 1 220 V Gated Light | low | inferred |
| C05 | 220 V per-level light (level TBD) | W05 | 3/4 | L5 → p4 → 220 V (per old doc, channel→level pending) | medium (driven by LIGHTS_1) | user 2026-04-28 |
| C06 | 220 V per-level light (level TBD) | W06 | 3/4 | (old doc said Rotating LED — corrected; it's a 220 V light) | medium (driven by LIGHTS_1) | user 2026-04-28 |
| C07 | 220 V per-level light (level TBD) | W07 | 4/4 | (old doc said Rotating LED — corrected; it's a 220 V light) | medium (driven by LIGHTS_1) | user 2026-04-28 |
| C08 | 220 V per-level light (level TBD) | W08 | 4/4 | (old doc said 24 V input — corrected; it's a 220 V light) | medium (driven by LIGHTS_1) | user 2026-04-28 |
| C09 | _unknown_ | W09 | 2/4 | L9 → p14 → Limit switch lin. actuator bottom rotation | low | inferred |
| C10 | _unknown_ | W10 | 2/4 | L10 → p1 → Limit switch lin. actuator bottom | low | inferred |
| C11 | _unknown_ | W11 | 2/4 | L11 → p15 → Limit switch lin. actuator top | low | inferred |
| C12 | _unknown_ | W12 | 2/4 | L12 → p16 → Limit switch lin. actuator top rotation | low | inferred |
| C13 | _unknown_ | W13 | 4/4 | L13 → p7 → Linear actuator bottom rotation | low | inferred |
| C14 | _unknown_ | W14 | 2/4 | L14 → p8 → Linear actuator Top | low | inferred |
| C15 | _unknown_ | W15 | 2/4 | L15 → p12 → Linear actuator Top rotation | low | inferred |
| C16 | _unknown_ | W16 | 2/4 | L16 → p2 → Linear actuator bottom | low | inferred |

---

## 220 V relays — clarified 2026-04-28

The relay hardware is an **8-channel** module driven by `LIGHTS_1` (Arduino Uno R3 on `/dev/lights_1`, EXP_022) over Uno digital pins **D2–D9**. **All eight channels are dedicated to per-level 220 V lights** — no rotating-LED rails, no 24 V input.

The specific channel→level mapping (and therefore channel→`C##` mapping) is **pending physical validation**: in the dashboard, click each toggle in turn, observe which level's light comes on, and write down `R<n> → Level <m> → C<##>`.

This **resolves the previously flagged conflicts** for `C06`, `C07`, `C08`: the `p_connector_assignments.md` entries for those three (Rotating LED gated power BOTTOM / TOP, and "24 V input to power central PCBs + motor") are wrong with respect to the front-panel side. They are 220 V gated lights. `p_connector_assignments.md` should be revisited to match.

## Open questions / conflicts to resolve

1. ~~C06 / C07 documented as Rotating LED~~ — resolved: 220 V light.
2. ~~C08 documented as 24 V input~~ — resolved: 220 V light.
3. **Channel → level → `C##` mapping** — pending validation by clicking each `LIGHTS_1` toggle and observing which physical light fires.
4. **Confirm C↔L physical numbering** — `cables.csv` says `W01` connects `C01` ↔ `L01`. EXP_020 validated each `W##` electrically but didn't verify that the labels physically match the front-panel order.
5. **Other C-connector functions** — C01/C02/C04 + C09–C16 are still inferred from the L↔p chain only; not directly observed at the front-panel.
6. **`p_connector_assignments.md` correction needed** — entries for L6/L7/L8 (Rotating LED rails and 24 V input) are inconsistent with the front-panel reality and should be revisited.

## Method note

This file is populated incrementally as EXP_021 collects evidence. Confidence levels:

- **high** — user-confirmed or directly measured at the C connector
- **medium** — backed by two independent sources (e.g. measurement + matching documented function)
- **low** — inferred from the C↔L↔p chain only, no direct observation at the front panel

## See also

- [`controller_backpanel.md`](controller_backpanel.md) — back-panel power ports (separate from C##)
- [`p_connector_assignments.md`](p_connector_assignments.md) — installation-side functions (the load each rail drives)
- [`cable_labeling.md`](cable_labeling.md) — naming convention
- [`../../experiments/EXP_021/`](../../experiments/EXP_021/) — the experiment producing this mapping
- [`../../experiments/EXP_020/`](../../experiments/EXP_020/) — W01–W16 cable continuity (parent)
