# Cable Labeling Convention — Cryptographic Beings

**Created:** 2026-04-15

---

## Rule

Every cable gets a unique wire number `W##`. Each end of the cable carries a label that combines the wire number with the connector it plugs into:

```
W{wire_number}-{connector_code}
```

Example — cable 1 runs between Controller connector `C01` and L-panel connector `L01`:

```
     ┌──────────────┐              ┌──────────────┐
     │   W01-C01    │──────────────│   W01-L01    │
     └──────────────┘              └──────────────┘
        ctrl end                       L-panel end
```

Reading any label tells you two things at once:
- **W01** — which physical wire this is (same on both ends)
- **C01** / **L01** — which connector this end plugs into

## Connector codes

| Prefix | Where | Numbering |
|--------|-------|-----------|
| `C##` | Controller-box internal connectors (driver/Arduino ports) | C01, C02, … |
| `L##` | L-panel aviator connectors (front of controller box) | L01–L16 |
| `P##` | P-panel connectors (installation side) | P01–P18 |
| `D##` | Device connectors inside the installation (motor, sensor, LED…) | D01, D02, … — or use device name (`MOTOR1`, `TUBE5`) |

## Wire number bands (optional convention)

To make the number itself informative at a glance:

| Band | Purpose | Count |
|------|---------|-------|
| W01–W16 | Controller-internal cables (C ↔ L) | 16 |
| W17–W32 | Bridge cables (L ↔ P), already mapped | 16 |
| W33–… | Installation-internal cables (P ↔ D) | up to 18 |

You don't have to follow bands — they just make it easy to know "W20 is a bridge cable" without looking it up.

## Examples

- Bridge cable between L1 and p5 → `W17-L01` / `W17-P05`
- Bridge cable between L13 and p7 → `W29-L13` / `W29-P07`
- Installation cable from p5 to Motor 1 → `W33-P05` / `W33-MOTOR1`
- Controller cable from Arduino pin group 3 to L3 → `W03-C03` / `W03-L03`

## Full path example (Arduino → motor)

A signal from Arduino channel 1 to motor 1 passes through three cables:

```
Arduino CH1
    │
    │  W01-C01  ─────  W01-L01
    │        controller cable
    ▼
  L01 (front of L-panel)
    │
    │  W17-L01  ─────  W17-P05
    │        bridge cable (per connector mapping)
    ▼
  P05 (back of P-panel)
    │
    │  W33-P05  ─────  W33-MOTOR1
    │        installation cable
    ▼
  motor 1
```

Three labeled cables, four labeled connectors, no ambiguity.

## Registry

All wires live in a single CSV so they can be sorted, filtered, and printed as labels:

[`../cables/cables.csv`](../cables/cables.csv)

Columns: `wire_number`, `end_a_label`, `end_a_connector`, `end_b_label`, `end_b_connector`, `family`, `notes`, `status`.

## Label printing (later)

With both end labels in CSV form, any label printer (Brother P-Touch, Dymo, thermal) can batch-print. For short labels like `W01-L01`, 6–9 mm tape is enough.
