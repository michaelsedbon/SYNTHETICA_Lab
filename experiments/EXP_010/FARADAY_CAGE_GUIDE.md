# Faraday Cage Setup Guide — Electrophysiology with LED Stimulation

## What Is a Faraday Cage?

A Faraday cage is a conductive enclosure that blocks external electromagnetic interference (EMI). When recording microvolt-level signals from mycelium (±39 mV range, targeting ~80–300 µV evoked potentials), even small EMI sources — WiFi routers, power supplies, monitor cables — can inject noise 10–100× larger than the signal of interest.

The cage works by redistributing charges on its surface to cancel external electric fields inside. Any conductive mesh with openings smaller than the wavelength of the interfering radiation will work. For our 50 Hz mains hum (λ = 6,000 km) and kHz-range switching noise, even coarse copper mesh is effective.

---

## What Goes INSIDE the Cage

| Item | Why Inside |
|------|-----------|
| **Petri dish** with mycelium culture | The biological sample must be shielded |
| **Electrodes** (E1, E2 in mycelium, EGND in agar) | Signal source — must be in the shielded volume |
| **LED-RING** (~70 blue LEDs) | Positioned directly below the petri dish (~3–5 mm from agar). Must be inside so light doesn't need to pass through the cage wall |
| **Small platform/stand** | Holds petri dish above LED-RING |

## What Stays OUTSIDE the Cage

| Item | Why Outside |
|------|------------|
| **ADC-24** (PicoLog) | USB-connected to computer. Its own metal enclosure provides shielding. Keeping it outside avoids routing USB through the cage |
| **LED-DRV8 board** | WiFi-connected. Antenna cannot be inside a Faraday cage. 12V power supply also stays outside |
| **12V power supply** | Switching PSU generates significant EMI — keep far from cage |
| **Computer** | Running the dashboard, obvious |

---

## Wiring

```
                    FARADAY CAGE (copper mesh)
                  ┌─────────────────────────────────────┐
                  │                                     │
                  │   ┌──── Petri Dish ────┐           │
                  │   │  E1  ●────┐        │           │
                  │   │  E2  ●────┤        │           │
                  │   │  EGND ●───┤        │           │
                  │   └───────────┤────────┘           │
                  │               │                     │
                  │   ┌── LED-RING ──┐                 │
                  │   │  70× blue LED │                │
                  │   │  (below dish)  │                │
                  │   └───┬──────────┘                 │
                  │       │                             │
    ══════════════╪═══════╪═════════════════════════════╡
    Aperture A    │       │ Aperture B                  │
    (electrode    │       │ (LED power)                 │
     leads)       │       │                             │
                  └───────┼─────────────────────────────┘
                          │
         ┌────────────────┤
         │                │
    ┌────▼────┐    ┌──────▼──────┐
    │ ADC-24  │    │  LED-DRV8   │
    │ (USB)   │    │  (WiFi)     │
    └────┬────┘    └──────┬──────┘
         │                │
    ┌────▼────┐    ┌──────▼──────┐
    │Computer │    │ 12V PSU     │
    └─────────┘    └─────────────┘
```

### Cable Routing Rules

1. **Two separate apertures** — electrode leads and LED power wires must enter the cage through different holes on opposite sides
2. **Seal apertures** — stuff copper mesh or copper tape around the cable entry points. Any gap is a noise antenna
3. **Twisted pairs** — the LED power wires (IN1/IN2 from DRV8870) should be twisted together to minimize radiated EMI
4. **Keep electrode leads short** — longer wires = more antenna. Route them directly to the nearest cage wall
5. **Ground the cage** — connect the copper mesh to the ADC-24's chassis ground (the BNC shield or a metal screw on the case)

### DRV8870 PWM Noise

The PCA9685 on the LED-DRV8 board drives the DRV8870 H-bridge at ~1 kHz by default. This switching creates EMI on the LED power wires. Mitigations:

- Route LED wires on the **opposite side** of the cage from electrode leads
- Add a **ferrite bead** on the LED power wires just before they enter the cage
- The ADC-24's 50 Hz mains rejection filter also attenuates higher harmonics

---

## Checklist Before Recording

- [ ] Cage is fully closed (no large openings)
- [ ] Both apertures sealed with copper mesh/tape
- [ ] Cage grounded to ADC-24 chassis
- [ ] LED power wires routed opposite side from electrode leads
- [ ] Electrode leads are short and don't loop
- [ ] Petri dish lid is on (prevents evaporation during long recordings)
- [ ] LED-RING is positioned and stable below the dish
- [ ] ADC-24 shows clean baseline before starting protocol (< 5 µV noise floor)
