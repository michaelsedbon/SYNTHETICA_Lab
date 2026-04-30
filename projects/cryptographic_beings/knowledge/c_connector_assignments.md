# C Connector Assignments — Cryptographic Beings Front Panel

**Source:** [EXP_021](../../experiments/EXP_021/summary.md) (front-panel mapping, in progress)
**Started:** 2026-04-28

This is the mapping of the **front-panel `C##` connectors** of the controller box. The back panel is documented separately in [`controller_backpanel.md`](controller_backpanel.md). The chain is:

```
C## (front panel)  ──W##──▶  L## (panel)  ──W(17–32)──▶  p## (installation)  ──W(33+)──▶  device
```

> **Convention update (2026-04-29):** The numerical labels `W##`, `C##`, `L##`, `p##` are independent — `W01` does **not** necessarily plug into `C01` and `L01`. Each W cable's two endpoints are determined empirically. Below we record only confirmed mappings.

---

## Confirmed mappings

| C connector | Cable | L connector | Bridge | p connector | Drives | Source / date |
|-------------|-------|-------------|--------|-------------|--------|----------------|
| **C15** | W03 (4 wires) | **L16** | W32 | p2 | **MOTOR_1 linear actuator** (DM556 STEP/DIR) | user 2026-04-29 |
| **C16** | W01 (3 wires) | **L10** | W26 | p1 | **MOTOR_1 limit sensor** (LJ8A3-2-Z/BX, NPN-NO) | user 2026-04-30 |

Both confirmed entries are for **MOTOR_1** (the bottom linear actuator). Together they form the complete signal path for that motor:

```
Arduino Nano (D2/D4 STEP/DIR) ── C15 ── W03 ── L16 ── W32 ── p2 ── DM556 ── motor coils
Arduino Nano (D3 INPUT_PULLUP) ── C16 ── W01 ── L10 ── W26 ── p1 ── LJ8A3 limit sensor
```

## TBD

| C connector | Status |
|-------------|--------|
| C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14 | Unknown — to be established as motors / sensors / lights are wired in |

The five 220 V SSR-driven channels exposed by `LIGHTS_1` (per-level lights) are also assigned to specific C connectors at the front panel, but **which** C labels those are has not yet been validated by clicking each toggle and observing which level's light fires. Those assignments will be added as a third row group when confirmed.

---

## 220 V relays — clarified 2026-04-28

The relay hardware is an **8-channel** module driven by `LIGHTS_1` (Arduino Uno R3 on `/dev/lights_1`, EXP_022) over Uno digital pins **D2–D9**. **All eight channels are dedicated to per-level 220 V lights** — no rotating-LED rails, no 24 V input.

The specific channel→level mapping (and therefore channel→`C##` mapping) is **pending physical validation**: in the dashboard, click each toggle in turn, observe which level's light comes on, and write down `R<n> → Level <m> → C<##>`.

This **resolves the previously flagged conflicts** for `C06`, `C07`, `C08`: the `p_connector_assignments.md` entries for those three (Rotating LED gated power BOTTOM / TOP, and "24 V input to power central PCBs + motor") are wrong with respect to the front-panel side. They are 220 V gated lights. `p_connector_assignments.md` should be revisited to match.

## Open questions / conflicts to resolve

1. ~~C06 / C07 documented as Rotating LED~~ — resolved: 220 V light.
2. ~~C08 documented as 24 V input~~ — resolved: 220 V light.
3. ~~`W##↔C##↔L##` numerical match assumption~~ — resolved 2026-04-29: explicit user clarification that the numbering is independent. Mappings are now empirical only.
4. **`LIGHTS_1` channel → C connector mapping** — pending validation by clicking each toggle and observing which level's light fires.
5. **Other C-connector functions** — C01–C14 still mostly unknown. They'll be filled in as more motors / sensors / loads are wired and identified.
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
