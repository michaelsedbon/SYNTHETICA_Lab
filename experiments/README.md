# Experiments

All lab experiments live under `experiments/`. Each experiment gets a sequential folder (`EXP_001`, `EXP_002`, …) containing standardised documentation and data files.

## Quick Start

| Action | Command |
|--------|---------|
| Create a new experiment | Use the AI assistant: `/create-experiment` |
| Sync experiments from Notion | `python3 scripts/sync_experiments.py` |
| Push local changes to Notion | `python3 scripts/push_experiment_to_notion.py EXP_XXX` |
| List all experiments | `python3 scripts/sync_experiments.py --list` |

## Folder Structure

Every experiment **must** contain these 4 files (see [EXPERIMENT_TEMPLATE.md](EXPERIMENT_TEMPLATE.md)):

```
experiments/EXP_XXX/
├── summary.md         # High-level overview, goals, status, results
├── LOG.md             # Chronological, append-only log of every action
├── SCRIPT_INDEX.md    # Index of scripts, firmware, data files
└── DOC_INDEX.md       # Index of all markdown/documentation files
```

Additional subdirectories are experiment-specific (e.g. `data/`, `figures/`, `model/`, `firmware/`, `hardware/`).

## Conventions

1. **Log everything** — every action, file creation, or change **must** be appended to `LOG.md` with a date heading (`## YYYY-MM-DD — Description`).
2. **Keep summary current** — after significant changes, update `summary.md`.
3. **Index new files** — scripts/data → `SCRIPT_INDEX.md`; markdown files → `DOC_INDEX.md`.
4. **Cross-link** — always use proper markdown links (`[REPORT.md](REPORT.md)`), never bare filenames.
5. **Sync to Notion** — after local updates, push with `python3 scripts/push_experiment_to_notion.py EXP_XXX`.

## Index

The master experiment index is [EXP_INDEX.md](EXP_INDEX.md) — a machine-readable list of all experiments with titles, dates, and one-line summaries. Updated automatically by sync scripts and the AI assistant.

## Current Experiments

| ID | Title | Status |
|----|-------|--------|
| EXP_001 | Growing *Pleurotus eryngii* | Active |
| EXP_002 | Cryptographic Beings — LLM Autonomous Control | Phase 2 |
| EXP_003 | Marimo Buoyancy Mathematical Modeling | Complete |
