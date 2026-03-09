# Brainstorm Round 2 — Light-Evoked Electrophysiology

*Updated 2026-03-09 after user feedback on Round 1*

---

## Decisions Made

| Decision | Outcome |
|----------|---------|
| LED wavelength | **Blue** (confirmed) — H1 is viable |
| LED position | LEDs sit **directly below** petri dish (not at 12 cm distance) |
| Hypothesis priority | H1 → H2 → H3 (agreed) |
| Adaptation | **Promoted from risk to research objective** — characterise desensitisation |
| Extended protocol (distance sweep, temporal patterns) | **Cut** |
| Companion app architecture | **Option A — standalone app** (separate port, separate repo) |
| ADC-24 dashboard | **Needs redesign** — protocol execution mode + timeline view + light data recording |
| No-biology control | User will prepare tomorrow |
| Faraday cage | LED-RING + petri dish + electrodes all go inside cage |

---

## Verified Claims: WC-1 Photoreceptor

### What Mishra et al. 2024 actually says

From the paper text (p.2, lines 118–125):

> *"Their light sensitivity is believed to be because of proteins, such as opsins, phytochromes, and **white collar-1 (WC-1)**, that change conformation in response to light. WC-1 is a **blue-light photoreceptor** that is sensitive to the **wavelengths between blue and ultraviolet (UV)**"*
> — Mishra et al. 2024, citing refs 39, 47, 48

The cited references are:
- **Ref 39:** Bahn et al. 2007 — *Sensing the environment: lessons from fungi* (Nat Rev Microbiol)
- **Ref 47:** Yu & Fischer 2019 — *Light sensing and responses in fungi* (Nat Rev Microbiol)
- **Ref 48:** (not identified)

### What I can and cannot verify

| Claim | Status | Source |
|-------|--------|--------|
| WC-1 is a blue-light photoreceptor | ✅ Verified | Mishra et al. 2024 p.2, direct quote above |
| WC-1 is sensitive to blue–UV wavelengths | ✅ Verified | Mishra et al. 2024 p.2 |
| WC-1 peak at ~450 nm | ⚠️ **NOT from Mishra paper** | This number was in our EXP_006 model code (`photoreceptor.py`), likely from Yu & Fischer 2019 — but that paper was NOT downloaded (Sci-Hub failure). Cannot verify the exact wavelength. |
| WC-1 is also a transcription factor | ⚠️ **NOT in Mishra paper** | This is well-established in fungal biology (WC-1 is part of the White Collar Complex that regulates circadian clock genes), sourced from Yu & Fischer 2019 and general knowledge. Not directly verifiable from papers we have. |

> [!WARNING]
> **The H3 hypothesis (sub-threshold priming via WC-1 transcription factor activity) is grounded in general fungal biology knowledge, not in data we can cite from papers in our collection.** We should treat it as speculative and lower priority.

### Recommendation

To properly ground the 450 nm claim and WC-1 transcription factor role, we should download Yu & Fischer 2019 (*Light sensing and responses in fungi*, Nature Reviews Microbiology). This is the definitive review on fungal photoreceptors.

---

## Updated Protocol (incorporating user feedback)

### Geometry Change

Mishra et al. used a UV lamp at 12–20 cm height above the plate. Our setup is different:
- LED-RING sits **directly below** the petri dish
- Approximate LED-to-agar distance: ~3–5 mm (dish plastic + agar thickness)
- Irradiance will be **much higher** per PWM step than in Mishra's setup

> [!IMPORTANT]
> **This means PWM 4095 at ~3 mm may well exceed 1.0 W/cm² — the highest intensity Mishra tested.** Start at very low PWM values (100–500) and increase carefully. Monitor for thermal effects.

### Updated Protocol Matrix

| Parameter | Values | Notes |
|-----------|--------|-------|
| **Exposure time** | 1 s, 2 s, 5 s | Kept short given proximity |
| **Intensity (PWM)** | 100, 500, 1024, 2048, 4095 | Start low — LEDs are very close |
| **ISI** | 20 s (standard), 60 s (for adaptation study) | |
| **Repetitions** | ≥7 per condition | Mishra standard |
| **Distance** | Fixed (below dish) | User will calculate exact distance later |

**Core conditions:** 3 exposure × 5 intensity = 15 conditions × 7 reps = **105 stimuli**
**Time:** 105 × (max 5 s stimulus + 20 s ISI) ≈ **~44 minutes** per run

### Adaptation Protocol (NEW — promoted from risk to research target)

| Parameter | Value |
|-----------|-------|
| Fixed stimulus | PWM 2048, 2 s exposure |
| ISI | 20 s |
| Repetitions | 50 consecutive |
| Measure | Evoked amplitude vs repetition number |
| Goal | Characterise decay time constant, recovery after 5-min rest |

### Controls

| Control | Status |
|---------|--------|
| Baseline (5 min unstimulated) | Ready now |
| Dark control (full duration, no stimulation) | Ready now |
| No-biology plate (agar only, same protocol) | **User will prepare tomorrow** |

---

## Faraday Cage Setup

**What goes inside the Faraday cage:**

1. **Petri dish** with mycelium culture (on a small platform/stand)
2. **LED-RING** positioned directly below the petri dish
3. **Electrodes** (E1, E2 inserted in mycelium, EGND in agar)
4. **Electrode cables** connected through the cage wall to the ADC-24

**What stays outside:**

1. **ADC-24** (USB-connected to computer)
2. **LED-DRV8 board** (WiFi-connected, 12V power)
3. **Computer** running the dashboard
4. **12V power supply** for LED-DRV8

**Cable routing:**
- Electrode leads: through small aperture with copper mesh seal
- LED power: thin wires from LED-DRV8 through a second sealed aperture to LED-RING inside cage
- Keep LED power wires as far from electrode leads as possible to avoid electromagnetic coupling

> [!TIP]
> The DRV8870 H-bridge on the LED-DRV8 board switches at ~1 kHz (PCA9685 default). This is well above the 10 S/s ADC sampling rate, but could create noise spikes if power wires couple to electrode leads. Route them on opposite sides of the cage.

---

## ADC-24 Dashboard Redesign Scope

The ADC-24 dashboard needs two major additions for EXP_010:

### 1. Protocol Execution Mode

When a protocol JSON is loaded:
- **Timeline view** showing the full protocol schedule (stimulus blocks, ISI, conditions)
- During recording, the timeline progresses in real time
- At each stimulus event, the dashboard sends HTTP calls to LED-DRV8 REST API
- Stimulus onset/offset markers appear on the live voltage trace

### 2. Stimulus-Annotated Data Recording

Current CSV columns: `timestamp, channel, raw_adc, voltage_uv`

New columns: `timestamp, channel, raw_adc, voltage_uv, stimulus_channel, stimulus_pwm, stimulus_event`

Where:
- `stimulus_channel`: LED-DRV8 channel number (0–7), empty when no stimulus
- `stimulus_pwm`: PWM value (0–4095), empty when no stimulus
- `stimulus_event`: `onset` | `offset` | empty

### 3. Architecture Sketch

```
┌─ Companion App (standalone, port 3002) ─────────────┐
│  Protocol Builder UI                                  │
│  Timeline Preview                                     │
│  JSON Import/Export                                    │
│  Literature Defaults                                   │
│  API endpoints for everything                         │
│  Load previous JSON for visualisation                 │
└───────────────────────────── exports JSON ────────────┘
                                    │
                                    ▼
┌─ ADC-24 Dashboard (port 3001/8000) ──────────────────┐
│  [Existing] Live voltage trace, stats, session list   │
│  [NEW] Protocol loader (JSON import)                  │
│  [NEW] Timeline view (shows protocol + progress)      │
│  [NEW] Stimulus scheduler (sends HTTP to LED-DRV8)    │
│  [NEW] Stimulus-annotated CSV export                  │
└───────────────────────────────────────────────────────┘
                                    │
                          HTTP to LED-DRV8
                                    ▼
                     ┌─ LED-DRV8 (leddriver.local) ─┐
                     │  POST /api/channel            │
                     │  POST /api/all                │
                     │  POST /api/stop               │
                     └───────────────────────────────┘
```

---

## Remaining Questions

1. **Yu & Fischer 2019 paper** — should I try to download it to verify the 450 nm claim and WC-1 transcription factor role? This would strengthen the scientific grounding of H1 and H3.

2. **Protocol JSON format** — Do you have a preference, or should I propose a schema based on the protocol matrix above?

3. **Companion app — should it be a new git submodule** (like the ADC-24 dashboard), or just a standalone repo?
