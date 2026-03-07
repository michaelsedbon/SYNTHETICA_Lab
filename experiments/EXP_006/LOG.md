# EXP_006 — Log

## 2026-03-06 — Experiment Created

- Initialised experiment folder from template
- Goal: Literature review and electrophysiology characterization for Bio Electronic Music project
- Seed paper: Mishra et al. 2024, *Science Robotics* — fungal biohybrid robots
- Paper already in `papers/Sensorimotor_control_of_robots_mediated.pdf` with text extract

## 2026-03-06 — Literature Collection

- Ran `explore_paper_network.py` with seed DOI `10.1126/scirobotics.adk8019`
- Found 11 citing papers (2025–2026), 0 references returned by API, 7 ML recommendations
- Citation network report saved to `citation_network_report.md`
- Identified 8 key references from the paper's bibliography for download
- Downloaded via Sci-Hub:
  - ✅ Adamatzky 2018 — *Pleurotus djamor* spiking (Sci. Rep.)
  - ✅ Olsson & Hansson 1995 — AP-like activity (Naturwissenschaften) — **wrong PDF received**
  - ✅ Bahn et al. 2007 — Environmental sensing (Nat. Rev. Microbiol.) — **wrong PDF received**
  - ❌ Slayman 1976, Adamatzky & Gandia 2021, Adamatzky 2022, Yu & Fischer 2019 — download failed
- Copied Fungal Sensing Skin paper from main `papers/` folder
- All available papers indexed in `agent_papers_txt/INDEX.md`
- Papers with failed downloads summarized from seed paper citations

## 2026-03-06 — Spiking Characterization Report

- Created comprehensive [REPORT.md](REPORT.md) with 7 sections:
  1. Experimental setup (hardware, organism, electrodes)
  2. Spontaneous spiking baseline (~135 µV mean, ~0.12 Hz, 30-day stability)
  3. UV light stimulation (intensity/distance/time dependence, 3–10× amplification)
  4. Blue light response (83 ± 11 µV, red/white = no response)
  5. Signal processing pipeline (Savitzky-Golay, SciPy peak detection)
  6. Cross-species comparison table (6 fungi species)
  7. Musical interpretation (tempo mapping, hardware requirements, ADC-24 overlap)
- Updated project summary (`projects/bio_electronic_music/summary.md`) — status → Active
- Added EXP_006 to `EXP_INDEX.md`

