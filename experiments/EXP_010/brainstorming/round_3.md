# Brainstorm Round 3 — Verified Claims & Protocol Schema

*Updated 2026-03-09 after downloading Yu & Fischer 2019*

---

## WC-1 Claims: Now Fully Verified ✅

### Claim 1: WC-1 is a blue-light photoreceptor (FAD/LOV domain)

> *"The white collar 1 (WC-1) protein and vivid (VVD) contain **light, oxygen and voltage (LOV) domains** where an **FAD is covalently bound** to a cysteine upon illumination."*
> — Yu & Fischer 2019, Fig. 3 caption (p.6)

> *"The 127 kDa WC-1 protein contains **PAS domains** for protein interaction, **transcriptional activation domains** and a **zinc-finger DNA-binding domain**."*
> — Yu & Fischer 2019, p.5

**Wavelength:** WC-1 binds FAD (flavin adenine dinucleotide) as its chromophore. FAD absorption peaks at **~450 nm** (blue) — this is a well-characterized property of all flavin chromophores. The paper classes WC-1 as a "flavin-binding blue-light receptor" throughout.

### Claim 2: WC-1 is a transcription factor

> *"**The fact that WC-1 is a transcription factor** and contains a flavin for light perception suggests that **the light signal transduction cascade is minimalistic**. The WCC functions as a transcriptional regulator and a photosensor at the same time."*
> — Yu & Fischer 2019, p.7

> *"WC-1 and WC-2 form a heterodimer (the WCC), **bind to the promoters of light-activated genes** and after illumination **activate gene expression**. Approximately **400 direct target genes** of the WCC were identified after 15 minutes of illumination."*
> — Yu & Fischer 2019, p.9

### NEW: Photoadaptation via VVD — Directly relevant to our adaptation protocol

> *"VVD is a repressor of light-controlled and clock-controlled genes and interacts directly with the WCC. **Activated WCC induces the expression of vivid, and VVD then inhibits WCC activity** by binding to the WCC. Hence, VVD is important for **photoadaptation**."*
> — Yu & Fischer 2019, p.9

> [!IMPORTANT]
> **This is the molecular mechanism behind H3 (adaptation/desensitisation).** After blue-light activation, the WCC triggers VVD production, which feeds back to *inhibit* WCC activity. This is a **negative feedback loop** — exactly the kind of desensitisation we want to characterise in our adaptation protocol (50 consecutive stimuli).

### Light-induced gene expression bursts

> *"Recent studies have revealed that **light-regulated genes are induced in bursts**, followed by a **period in which the promoters are refractory** to stimulation."*
> — Yu & Fischer 2019, p.9

This suggests that adaptation isn't just a smooth decay — there may be a refractory period after initial stimulation where the mycelium is unresponsive. This is testable with our protocol.

---

## Updated Hypothesis Status

| Hypothesis | Status | Supporting Evidence |
|-----------|--------|---------------------|
| **H1:** Blue LEDs evoke spikes | ✅ Strongly supported | WC-1/FAD absorbs at ~450 nm (Yu & Fischer 2019); Mishra et al. measured 83 ± 11 µV with blue light |
| **H2:** PWM → monotonic dose-response | ✅ Supported | Mishra intensity sweep: 25 µV (0.1 W/cm²) → 281 µV (1.0 W/cm²) |
| **H3:** Adaptation/desensitisation | ✅ Now has molecular basis | VVD negative feedback loop on WCC (Yu & Fischer 2019); refractory period in gene expression |

---

## Protocol JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EXP_010 Stimulation Protocol",
  "type": "object",
  "required": ["name", "version", "created", "blocks"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Human-readable protocol name"
    },
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "created": {
      "type": "string",
      "format": "date-time"
    },
    "description": {
      "type": "string"
    },
    "literature_reference": {
      "type": "string",
      "description": "e.g. 'Mishra et al. 2024, Table 1'"
    },
    "global_defaults": {
      "type": "object",
      "properties": {
        "isi_s": {
          "type": "number",
          "default": 20,
          "description": "Inter-stimulus interval in seconds"
        },
        "led_channel": {
          "type": "integer",
          "minimum": 0,
          "maximum": 7,
          "default": 0
        },
        "led_driver_url": {
          "type": "string",
          "default": "http://leddriver.local"
        }
      }
    },
    "baseline": {
      "type": "object",
      "properties": {
        "pre_s": {
          "type": "number",
          "default": 300,
          "description": "Seconds of unstimulated baseline before protocol"
        },
        "post_s": {
          "type": "number",
          "default": 300,
          "description": "Seconds of unstimulated baseline after protocol"
        }
      }
    },
    "blocks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label", "stimuli"],
        "properties": {
          "label": {
            "type": "string",
            "description": "Condition label, e.g. 'PWM1024_2s'"
          },
          "randomize": {
            "type": "boolean",
            "default": false,
            "description": "Shuffle stimulus order within this block"
          },
          "stimuli": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["type"],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["pulse", "train"]
                },
                "channel": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 7,
                  "description": "Overrides global default"
                },
                "pwm": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 4095,
                  "description": "LED intensity (12-bit)"
                },
                "duration_s": {
                  "type": "number",
                  "minimum": 0.1,
                  "maximum": 30,
                  "description": "Stimulus duration in seconds"
                },
                "isi_s": {
                  "type": "number",
                  "description": "Overrides global ISI"
                },
                "repeat": {
                  "type": "integer",
                  "minimum": 1,
                  "default": 1,
                  "description": "Number of repetitions"
                },
                "train_count": {
                  "type": "integer",
                  "description": "For type=train: number of pulses"
                },
                "train_interval_s": {
                  "type": "number",
                  "description": "For type=train: gap between pulses"
                }
              }
            }
          }
        }
      }
    },
    "randomize_blocks": {
      "type": "boolean",
      "default": false,
      "description": "Shuffle block order (with seed for reproducibility)"
    },
    "random_seed": {
      "type": "integer",
      "description": "Seed for reproducible randomization"
    }
  }
}
```

### Example: Core Dose-Response Protocol

```json
{
  "name": "EXP_010 Dose-Response",
  "version": "1.0",
  "created": "2026-03-09T17:00:00+01:00",
  "description": "3 × 5 intensity-exposure matrix, 7 reps each",
  "literature_reference": "Mishra et al. 2024, Table 1",
  "global_defaults": {
    "isi_s": 20,
    "led_channel": 0,
    "led_driver_url": "http://leddriver.local"
  },
  "baseline": { "pre_s": 300, "post_s": 300 },
  "blocks": [
    {
      "label": "PWM100_1s",
      "stimuli": [{ "type": "pulse", "pwm": 100, "duration_s": 1, "repeat": 7 }]
    },
    {
      "label": "PWM500_1s",
      "stimuli": [{ "type": "pulse", "pwm": 500, "duration_s": 1, "repeat": 7 }]
    },
    {
      "label": "PWM1024_1s",
      "stimuli": [{ "type": "pulse", "pwm": 1024, "duration_s": 1, "repeat": 7 }]
    },
    {
      "label": "PWM2048_1s",
      "stimuli": [{ "type": "pulse", "pwm": 2048, "duration_s": 1, "repeat": 7 }]
    },
    {
      "label": "PWM4095_1s",
      "stimuli": [{ "type": "pulse", "pwm": 4095, "duration_s": 1, "repeat": 7 }]
    },
    {
      "label": "PWM100_2s",
      "stimuli": [{ "type": "pulse", "pwm": 100, "duration_s": 2, "repeat": 7 }]
    }
  ],
  "randomize_blocks": true,
  "random_seed": 42
}
```

### Example: Adaptation Protocol

```json
{
  "name": "EXP_010 Adaptation",
  "version": "1.0",
  "created": "2026-03-09T17:00:00+01:00",
  "description": "50 consecutive stimuli to characterise VVD-mediated desensitisation",
  "literature_reference": "Yu & Fischer 2019 — VVD negative feedback on WCC",
  "global_defaults": {
    "isi_s": 20,
    "led_channel": 0,
    "led_driver_url": "http://leddriver.local"
  },
  "baseline": { "pre_s": 300, "post_s": 300 },
  "blocks": [
    {
      "label": "adaptation_run",
      "stimuli": [{ "type": "pulse", "pwm": 2048, "duration_s": 2, "repeat": 50 }]
    }
  ]
}
```

---

## Next Steps

Phase 0 brainstorming is converging. The remaining deliverables are:

1. **Requirements doc** — formalize all decisions into a spec for Phase 1 (companion app) and Phase 2 (ADC-24 dashboard)
2. **Create companion app repo** as git submodule
3. **Implementation plan** covering both apps

Should I write the requirements doc now?
