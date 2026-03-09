# EXP_010 — Brainstorm Round 1: Light-Evoked Electrophysiology

## Context Summary

I've read all the project context. Here's what we're working with:

| Asset | Status |
|-------|--------|
| **Mycelium** | Growing on PDA dish, signal onset confirmed at ~330 h (EXP_001). Sustained ~135 µV baseline matches Mishra et al. |
| **ADC-24** | Working, custom driver 68× lower noise than PicoLog. ±39 mV, 10 S/s, differential. |
| **LED-DRV8** | Verified working. 8-ch, 12-bit PWM (0–4095), REST API at `leddriver.local`. |
| **LED-RING** | ~70 LEDs, 12V, connected to driver board. |
| **Dashboard** | FastAPI + Next.js. Records voltage, streams via WebSocket, exports CSV. |

---

## 1. Hypotheses for Discussion

I've formulated three testable hypotheses grounded in the Mishra et al. data. **Which directions do you want to prioritize?**

### H1: Blue-light evoked spikes are detectable with the LED-RING

**Prediction:** 2 s exposure at 12 cm distance → evoked spike of ~83 ± 11 µV above baseline.

**Rationale:** Mishra et al. used a UV mercury lamp (OmniCure S1500), but P. eryngii responded to blue light too (via WC-1 photoreceptor, λ ~ 450 nm). The LED-RING likely emits blue or warm-white LEDs. If they have any blue component, they should trigger WC-1.

**Key risk:** The LED-RING wavelength may not overlap the WC-1 absorption peak. If the LEDs are warm white (peak ~600 nm), the blue component at 450 nm may be too weak.

> [!IMPORTANT]
> **Action needed:** What wavelength are the LEDs on the LED-RING? This determines viability of the entire experiment. If they're blue (~450 nm) — excellent. If warm white — we may need to measure the blue spectral component, or add dedicated blue LEDs to one of the 8 channels.

### H2: PWM intensity maps monotonically to evoked spike amplitude

**Prediction:** A dose-response curve from PWM 500 → 4095 produces a monotonic increase in evoked V_light, saturating around 3–10× V_native.

**Rationale:** Mishra et al. showed intensity-dependent responses from 25 µV (0.1 W/cm²) to 281 µV (1.0 W/cm²) with UV. Our LED-DRV8 gives 12-bit PWM control. The mapping PWM → irradiance (W/cm²) depends on LED specs and distance, but the dose-response relationship should be monotonic.

**Key unknown:** What irradiance does PWM 4095 deliver at 12 cm? Without a radiometer, this needs to be calibrated from the biological response itself (using Mishra et al. as reference).

### H3: Sub-threshold light priming enhances subsequent evoked responses

**Prediction:** A low-intensity "primer" pulse (PWM ~500, 1 s) delivered 5 s before a full stimulus will increase the evoked spike amplitude by 20–50% compared to an un-primed stimulus.

**Rationale:** WC-1 is not just a photoreceptor — it's a transcription factor involved in light adaptation. Brief sub-threshold exposure may mobilize WC-1 signaling without triggering a spike, effectively "priming" the system. If true, this opens up interesting compositional possibilities for the bio-electronic music project (rhythmic priming patterns).

**Status:** *Speculative.* Should be lower priority than H1 and H2.

---

## 2. Things That Could Go Wrong

| Risk | Mitigation |
|------|-----------|
| **LED wavelength mismatch** | Verify LED specs or measure spectrum. Keep channel(s) available for dedicated blue LEDs. |
| **Thermal artifacts** | LEDs generate heat. At high PWM sustained exposure, agar temperature rises → resistance change → baseline drift. Use short exposures (≤ 2 s) with ≥ 20 s ISI. Include "LED on, no biology" control plate. |
| **Electrode drift** | Long recordings show baseline wander (EXP_001 showed ramp from 0→150 µV over ~100 h). Use high-pass filtering or detrending before stimulus-triggered averaging. |
| **Photobleaching / adaptation** | With ≥7 repetitions per condition, the mycelium may adapt (WC-1 desensitization). Randomize condition order. Monitor for amplitude decay across repetitions. |
| **Network latency** | HTTP calls to `leddriver.local` add 10–50 ms jitter. For 2 s exposures at 10 S/s, this is acceptable (~1 sample). Log the actual request/response timestamps, not expected times. |
| **Faraday cage light ingress** | ADC-24 is inside copper mesh cage. Need LED light to enter cage while maintaining EM shielding. Route optical fiber or use small aperture with copper mesh seal. |

---

## 3. Protocol Matrix Proposal

Based on Mishra et al. Table 1, here's a proposed stimulus matrix. **Each condition gets ≥7 repetitions, randomized.**

### Core Protocol (Replication of Mishra et al.)

| Parameter | Values | Rationale |
|-----------|--------|-----------|
| **Exposure time** | 2 s, 5 s, 12 s | Mishra Table 1: 2 s → 237 µV, 12 s → 499 µV |
| **Intensity (PWM)** | 1024, 2048, 4095 | ~25%, 50%, 100% — maps to Mishra's 0.1–1.0 W/cm² |
| **ISI** | 20 s | Mishra robot control protocol |
| **Distance** | 12 cm (fixed initially) | Mishra primary measurement distance |

**Core conditions:** 3 exposure × 3 intensity = **9 conditions × 7 reps = 63 stimuli**  
**Time:** 63 × (stimulus + 20 s ISI) ≈ **~25 minutes** per run

### Controls

| Control | Purpose |
|---------|---------|
| **Baseline** | 5 min unstimulated recording before/after |
| **No-biology plate** | Same protocol on agar-only dish to quantify thermal/electrical artifacts |
| **Dark control** | Full recording duration, no stimulation, to characterize spontaneous rate |

### Extended Protocol (if H1 succeeds)

| Parameter | Values |
|-----------|--------|
| Distance sweep | 10 cm, 12 cm, 15 cm, 20 cm |
| Temporal patterns | Pulse trains (5×1 s at 2 s intervals vs 1×5 s continuous) |
| Multi-channel | Channels 1–4 independently, test spatial selectivity |

---

## 4. Verify-Paper-Claims Flags

From reading EXP_006/REPORT.md, I note these points worth cross-checking:

> [!WARNING]
> **Mishra et al. used a UV mercury lamp (OmniCure S1500), not LEDs.** The paper reports blue light response (83 ± 11 µV) but this was one measurement condition, not the primary data. Most of the quantitative dose-response data is UV (350–435 nm). Our LED-RING is a completely different light source — we should be cautious about directly mapping Mishra's intensity values to our PWM levels.

> [!NOTE]
> **High biological variability:** Plate 1 showed V_light = 25–281 µV while Plate 2 showed 208–18,569 µV for the same conditions. Our first mycelium plate may respond very differently. Start with exploratory runs before committing to the full matrix.

> [!NOTE]
> **One of the cited papers (Adamatzky 2021, fungal sensing skin) is RETRACTED.** We should not build on [FSS21] data. Fortunately, EXP_006 REPORT.md already flags this.

---

## 5. Companion App Scope — Initial Feature Proposals

Here's what I think the Experiment Designer companion app should include. **Please confirm, cut, or add:**

### Must-Have (MVP)

| Feature | Description |
|---------|-------------|
| **Protocol builder** | Define stimulus blocks: type (single/train), channel(s), PWM intensity, duration, ISI, repetitions |
| **Timeline preview** | Visual horizontal timeline showing when each stimulus fires, with color-coding by condition |
| **Parameter validation** | Warn if ISI < 10 s (adaptation risk), exposure > 15 s (thermal risk), or total duration > 2 h |
| **JSON export** | Export protocol as a JSON file loadable by the ADC-24 dashboard |
| **Literature defaults** | Pre-fill suggested values from Mishra et al. data (2 s exposure, 20 s ISI, etc.) |

### Nice-to-Have

| Feature | Description |
|---------|-------------|
| **Randomization** | Auto-randomize condition order with seed for reproducibility |
| **Protocol library** | Save/load named protocols |
| **Estimated duration** | Show total protocol time including baseline periods |
| **Condition summary table** | Auto-generated table of all conditions and rep counts |

### Probably Not Now

| Feature | Why defer |
|---------|----------|
| Real-time preview with LED-DRV8 | Adds complexity, test on hardware directly |
| Analysis integration | That's Phase 3 |
| Multi-plate scheduling | We have one culture |

---

## Questions for You

1. **What wavelength are the LEDs on the LED-RING?** (This is the single most important fact — if they're red or warm-white only, we need to source blue LEDs or use a different light source.)

2. **Is the LED-RING physically positioned inside the Faraday cage, or will light need to enter through an opening?** This affects signal quality during stimulation.

3. **How old is the mycelium now and how much has it grown?** The signal onset at hour 330 in EXP_001 was ~2 weeks ago. Is the culture still producing stable baseline signals?

4. **Which hypothesis excites you most?** I recommend prioritizing H1 (basic blue light response) → H2 (dose-response) → H3 (priming) in that order. Do you agree, or do you want to jump to something more specific?

5. **For the companion app — standalone web app or built into the ADC-24 dashboard?** Options:
   - **(A) Standalone app** (separate port, separate repo) — simpler to build, can use independently
   - **(B) New tab/section in ADC-24 dashboard** — everything in one place, but more complex to add
   - **(C) Hybrid** — standalone app exports JSON, dashboard imports it

   I recommend **(C)** — cleanest separation of concerns, and the protocol designer can evolve independently.
