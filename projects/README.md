# Projects

High-level project workspaces that aggregate experiments, knowledge, hardware designs, and bibliography across the SYNTHETICA lab.

Each project folder contains:
- **`summary.md`** — Project overview with an auto-populated experiment list (synced from Notion)
- **`knowledge/`** — Persistent knowledge base: learnings, reference data, design decisions
- **`hardware/`** — CAD files, schematics, PCB designs (if applicable)

## Active Projects

| Project | Folder | Description |
|---------|--------|-------------|
| Cryptographic Beings | `cryptographic_beings/` | Bio-hybrid art installation using Marimo algae for binary data storage |
| Bio Electronic Music | `bio_electronic_music/` | Biological signal → electronic music pipeline |

## Syncing

Run `python3 scripts/sync_project_summaries.py` to refresh the experiment lists from Notion.
