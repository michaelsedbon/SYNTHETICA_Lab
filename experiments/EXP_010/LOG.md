# EXP_010 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-09 — Experiment Created

- Initialised experiment folder from template.
- Goal: Light-evoked electrophysiology of *P. eryngii* using ADC-24 + LED-DRV8
- Phase 0 brainstorming started — see `brainstorming/` subfolder

## 2026-03-09 — Brainstorming Round 1

- Reviewed all context: EXP_006 (Mishra et al. data), EXP_009 (LED-DRV8 hardware), EXP_001 (mycelium growth, signal onset at ~330 h)
- Proposed 3 hypotheses: H1 (blue light detection), H2 (dose-response), H3 (sub-threshold priming)
- User feedback: LED-RING confirmed blue, LEDs sit below petri dish (not 12 cm), adaptation is a research target, standalone companion app preferred

## 2026-03-09 — Brainstorming Round 2

- Verified WC-1 claims against Mishra et al. 2024 paper text
- Updated protocol for below-dish LED geometry
- Added adaptation characterisation as explicit research objective
- Proposed Faraday cage setup and ADC-24 dashboard redesign scope

## 2026-03-09 — Brainstorming Round 3 + Implementation Plan

- Downloaded and read Yu & Fischer 2019 for WC-1 verification
- Finalised protocol JSON schema (blocks, stimuli, baselines, randomisation)
- Wrote implementation plan: 3-phase approach (companion app → dashboard extensions → analysis)

## 2026-03-09 — Phase 1: Experiment Designer App

- Scaffolded `applications/experiment-designer/` (Next.js + FastAPI)
- Built protocol builder with block/stimulus editors, timeline preview, JSON import/export
- Added dose-response preset (3×5 intensity matrix, 15 blocks, 105 stimuli, 49m 40s)
- Added adaptation preset (single-intensity, 50 reps)
- Skill Manager dark theme (#1e1e1e base, #569cd6 accent)
- FastAPI backend with CRUD + validation endpoints
- Browser-tested and verified build (0 errors)
- Registered in App Launcher as app #12 (ports 8005/3006)

## 2026-03-09 — Phase 2: ADC-24 Dashboard Extensions

- Created `led_client.py` — async HTTP client for LED-DRV8
- Created `stimulus_scheduler.py` — background scheduler with precise timing
- Extended `main.py` — 4 protocol endpoints, stimulus-annotated CSV (7 columns)
- Created `ProtocolControls` sidebar component (JSON loader, start/stop, progress bar)
- Added httpx to server requirements
- Deployed to local and production server (172.16.1.80)
