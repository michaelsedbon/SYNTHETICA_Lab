# KiCad PCB Editor — Cheatsheet

## Selection & Navigation

| Key | Action |
|---|---|
| **Click** | Select item |
| **Cmd+A** | Select all |
| **Cmd+F** | Find component by reference |
| **Scroll** | Zoom in/out |
| **Middle-click drag** | Pan |
| **Home** | Fit board to screen |

## Component Placement

| Key | Action |
|---|---|
| **T** | Get & move footprint by reference (type "U11") |
| **M** | Move selected component |
| **R** | Rotate 90° |
| **F** | Flip to other side (F.Cu ↔ B.Cu) |
| **E** | Open properties (edit) |
| **Delete** | Delete selected |
| **Cmd+Z** | Undo |

## Routing

| Key | Action |
|---|---|
| **X** | Start routing a trace |
| **Esc** | Stop routing / cancel |
| **V** | Drop via (switch layer) mid-route |
| **/** | Switch route posture (45° bend direction) |
| **W** | Change trace width (cycles through sizes) |
| **D** | Start differential pair routing |
| **U** | Route from the other end of a ratsnest line |
| **Backspace** | Undo last routing segment |

### Routing Modes (press while routing)
| Key | Mode |
|---|---|
| **1** | Walk-around obstacles |
| **2** | Shove obstacles aside |
| **3** | Highlight collisions (don't avoid) |

## Copper Zones (Ground/Power Planes)

| Key | Action |
|---|---|
| **B** | Fill all zones |
| **Cmd+B** | Unfill all zones |
| **Add zone:** | Select layer → Place → Zone → pick net → draw boundary |

## Layers

| Key | Action |
|---|---|
| **Page Up/Down** | Cycle through layers |
| **+/-** | Next/previous copper layer |
| **Click layer panel** | Switch active layer |

## Measurement & DRC

| Key | Action |
|---|---|
| **Cmd+Shift+M** | Measure distance |
| **Inspect → DRC** | Run design rules check |

## Display

| Key | Action |
|---|---|
| **N** | Toggle ratsnest (unrouted connections) |
| **H** | Toggle high-contrast mode (dims inactive layers) |
| **Alt+3** | Open 3D viewer |

## Routing Tips for This Board

- **Trace widths:** Signal = 0.2mm, Power = 0.4mm+
- **Clearance:** Min 0.15mm (JLCPCB standard)
- **Analog traces:** Keep short, away from digital, route on one layer
- **Differential pairs:** Keep electrode ±  traces equal length, parallel
- **Decoupling:** Route cap → IC pin → via to GND plane (shortest path)
- **No traces under crystal:** Keep copper clear zone around U13
