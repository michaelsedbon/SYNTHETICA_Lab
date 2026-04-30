# P Connector Assignments — Cryptographic Beings

**Source:** `experiments/EXP_004/webapp/connectome/p_assignments_2026-04-13.xlsx`  
**Updated:** 2026-04-15 (reshuffled light & power assignments)

---

## Summary by Function Type

| Type | Count | P Positions |
|------|-------|------------|
| Linear actuator (4/4 wires) | 4 | p2, p7, p8, p12 |
| Limit switch (3/4 wires) | 4 | p1, p14, p15, p16 |
| Power & lighting (2/4 wires) | 8 | p3, p4, p5, p6, p9, p10, p11, p17 |
| Unused | 2 | p13, p18 |

---

## Full Assignment Table

| P Connector | Connector Type | L Connector | Wires | Assigned Function | Notes |
|-------------|---|-------------|-------|-------------------|-------|
| **p1** | M8 | L10 | 3/4 | Limit switch Linear actuator Bottom | scan false positive m2+m3, cable good |
| **p2** | M12 | L16 | 4/4 | Linear actuator bottom | |
| **p3** | M12 | L4 | 2/4 | Level 1 220v Gated Light | |
| **p4** | M12 | L5 | 2/4 | Level 2 220v Gated Light | |
| **p5** | M12 | L1 | 2/4 | Level 3 220v Gated Light | |
| **p6** | M12 | L2 | 2/4 | Level 4 220v Gated Light | reworked, was partly on p18 |
| **p7** | M12 | L13 | 4/4 | Linear actuator bottom rotation | housing can be pushed down — shim needed |
| **p8** | M12 | L14 | 4/4 | Linear actuator Top | |
| **p9** | M12 | L3 | 2/4 | Level 5 220v Gated Light | |
| **p10** | M12 | L7 | 2/4 | Rotating LED gated power TOP | |
| **p11** | M12 | L6 | 2/4 | Rotating LED gated power BOTTOM | |
| **p12** | M12 | L15 | 4/4 | Linear actuator Top rotation | |
| **p13** | — | — | — | (internal wires only) | no L cable |
| **p14** | M8 | L9 | 3/4 | Limit switch Linear actuator Bottom rotation | |
| **p15** | M8 | L11 | 3/4 | Limit switch Linear actuator top | |
| **p16** | M8 | L12 | 3/4 | Limit switch Linear actuator top rotation | |
| **p17** | M8 | L8 | 2/4 | **24V input to power all central PCBs + motor** | scan false positive m2+m3, cable good |
| **p18** | — | — | — | (empty / unused) | |

---

## Key Points

- **24V power** enters via **p3 (L4)** and daisy-chains through central PCBs
- **Linear actuators** use 4/4 wires: bottom (p2, L16), top (p8, L14), plus rotation channels (p7/L13, p12/L15)
- **Limit switches** use 3/4 wires for actuator position sensing (p1, p14, p15, p16)
- **220V gated lights** use 2/4 wires across 5 levels (p6, p9, p10, p11, p17)
- **LED power** gating for top/bottom rotation (p4, p5)
- **p13, p18** unused on installation side
