# Controller Box — Backpanel Power Map

**Updated:** 2026-04-28

Notes on what the **back-panel** ports of the controller box carry. Pairs with [`p_connector_assignments.md`](p_connector_assignments.md) (installation-side / P-panel) and [`cable_labeling.md`](cable_labeling.md) (cable naming).

> **Important:** the controller-box backpanel ports are **not** the `C##` connectors. `C01`, `C02`, … are on the **front panel** of the controller box. The backpanel ports are a separate set of connectors with their own numbering (port 1, port 2, …) and don't follow the W##/C##/L## cable convention.

---

## Power on the backpanel

| Backpanel port | Voltage | Notes |
|----------------|---------|-------|
| **Port 1** | **Regulated 12 V** | |
| **Port 2** | **Regulated 12 V** | |

## Cross-reference

- 24 V system power enters via the installation side (p17) and daisy-chains through the central PCBs — see [`p_connector_assignments.md`](p_connector_assignments.md).
- The 12 V on backpanel ports 1–2 is regulated — likely stepped down from the 24 V supply, but confirm at the PSU / regulator board if it matters for a downstream load.

## Open

- [ ] Document remaining backpanel ports (3+) when their voltages/functions are known.
- [ ] Note relationship (if any) between backpanel ports and the front-panel `C##` connectors.
