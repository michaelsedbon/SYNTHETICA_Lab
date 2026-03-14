# AI Assistant Manifest — SYNTHETICA Personal Lab

This file is the AI lab assistant's persistent memory for this workspace.
Read it at the start of every conversation.

## Project Type

Personal lab workspace for the SYNTHETICA project. Integrates with Notion (lab notebook + bibliography) and Airtable (reagents, labware, experiment data).

## Key Data Sources

| Source | Platform | Database ID |
|---|---|---|
| Lab Notebook | Notion | `30a165923a21808ea1d1cdf715e76b89` |
| Bibliography | Notion | `23b165923a2180eea5d2ebc0f10ef03e` |
| Reagents & Labware | Airtable | Base `appS6rrpVWIV28yFh` |

## Notion Lab Notebook Schema

| Property | Type | Example |
|---|---|---|
| Name | title | "Mycelium growth test" |
| Exp Number | select | EXP_001 |
| Start Date | date | 2026-02-17 |
| Airtable Link | multi_select | MS_S_001 |
| Project link | multi_select | Cryptographic Beings |

## Notion Bibliography Schema

| Property | Type | Notes |
|---|---|---|
| Name | title | Paper title |
| Subject | multi_select | Synthetic Retinas, Mycelium, DNA Computing, etc. |
| Paper | files | PDF attachment |
| Supplementary | files | Supplementary materials |
| Application Field | multi_select | Project area |
| URL | url | Paper URL/DOI |

## Airtable Schema

**Reagents table:** Name, Reference Number, Supplier, Link, Storage, Notes, Type, Project
**Labware table:** Name, Reference Number, Supplier, Link, Storage, Notes

## Key Directories & Files

| Path | Purpose |
|---|---|
| `config.yaml` | API credentials (gitignored) |
| `scripts/` | Python sync scripts |
| `papers/` | Downloaded reference PDFs (user's collection) |
| `papers_txt/` | Plain-text extracts of PDFs |
| `papers_txt/INDEX.md` | **Paper index** — summaries & metadata for AI lookup |
| `agent_papers/` | PDFs downloaded by AI assistant |
| `agent_papers_txt/` | Text extracts of AI-downloaded papers |
| `experiments/` | Per-experiment folders |
| `experiments/EXP_INDEX.md` | **Experiment index** — summaries for AI lookup |
| `projects/` | High-level project workspaces aggregating experiments, knowledge, hardware |
| `projects/*/summary.md` | **Project summaries** — auto-populated experiment lists from Notion |

## Skills

All skills in `.agent/skills/` are **symlinks** to the central library at `~/antigravity-skills/`.

The library has three sections:
- **`built-in/`** — Antigravity core skills (58)
- **`custom/`** — Lab-specific skills (3)
- **`third-party/`** — External repos like K-Dense scientific skills (173)

Browse `~/antigravity-skills/INDEX.md` for the full catalog. Install new skills with `/install-skill`.

Currently installed:

| Skill | Source | Description |
|-------|--------|-------------|
| `fetch-papers` | custom | Download PDFs from Sci-Hub via DOI. Uses `scripts/fetch_papers.py` |
| `explore-paper-network` | custom | Map citation networks using Semantic Scholar. Uses `scripts/explore_paper_network.py` |
| `verify-paper-claims` | custom | Download a paper, extract text, verify claims before citing |
| `brainstorming` | built-in | Structured brainstorming methodology |
| `pdf` | built-in | PDF handling |
| `planning-with-files` | built-in | File-based planning |
| `skill-creator` | built-in | Meta-skill: how to create new skills |
| `systematic-debugging` | built-in | Debugging methodology |
| `theme-factory` | built-in | UI theme generation |
| `webapp-testing` | built-in | Web app testing |
| `writing-plans` | built-in | Writing plans |
| `xlsx` | built-in | Excel file handling |
| `pcb-literature-scout` | custom | Deep research for open-source & academic PCB reference designs |
| `pcb-component-analyst` | custom | Tiered design proposals with functional block decomposition & pre-BOMs |
| `pcb-component-sourcer` | custom | LCSC/JLCPCB component sourcing with stock, pricing, and alternatives |
| `pcb-schematic-generator` | custom | Atopile (.ato) schematic generation from sourced BOM |

## Workflows

Slash-commands available in `.agent/workflows/`:

| Command | Description |
|---------|-------------|
| `/orient` | Orient yourself in a new conversation — read persistent memory files in the right order |
| `/end-of-day` | End-of-day memory update — refresh AGENT_STATE.md with today's work and priorities |
| `/catch-up` | Sync bibliography + experiments from Notion, report what's new |
| `/sync-bibliography` | Sync bibliography only (download PDFs, extract text, update INDEX) |
| `/sync-experiments` | Sync experiments only |
| `/sync-projects` | Sync project summaries — refresh experiment lists from Notion |
| `/create-experiment` | Scaffold a new experiment folder with all 4 template files |
| `/update-experiment` | Append notes/data to an experiment and sync to Notion |
| `/create-app` | Scaffold a new application (Next.js + FastAPI) |
| `/deploy` | Commit, push, and deploy to production server (`172.16.1.80`) |
| `/push-app` | Commit and push changes to one app submodule |
| `/push-all-apps` | Push all modified app submodules |
| `/pull-apps` | Pull latest for all app submodules |
| `/deploy-agent-gemini` | Deploy the lab agent with Gemini Flash Plan-Execute-Reflect architecture |
| `/install-skill` | Install or remove skills from `~/antigravity-skills` central library |
| `/ota-update` | Build and flash ESP firmware over WiFi via PlatformIO OTA |
| `/preview-markdown` | Open any markdown file in the Experiment Viewer for preview |
| `/design-pcb` | Multi-step PCB design pipeline — literature, tiered design, LCSC sourcing, Atopile schematic |
| `/edit-pcb` | Enter PCB design edit mode — modify .ato files, rebuild, and keep KiCad reference in sync |
| `/convert-heic` | Convert HEIC images to JPG format using macOS sips |
| `/audit-docs` | Read-only audit of all experiments, apps, and projects — report documentation gaps |
| `/update-knowledge-base` | Update a project's knowledge base after changes to hardware, firmware, APIs, or software |

**When creating a new workflow**, you **MUST** also:
1. Add it to the table above.
2. Add it to `CHEATSHEET.md` (the user's quick reference for all slash commands).

Failure to update both files means the user won't know the workflow exists.

## Literature Lookup

When answering questions about the project's literature:

1. **Read `papers_txt/INDEX.md`** first to identify the relevant paper(s).
2. **Load the full text** from the corresponding `.txt` file(s) in `papers_txt/`.
3. Answer with the full paper(s) as context — do not guess or paraphrase from memory alone.

## Experiment Lookup

When answering questions about experiments:

1. **Read `experiments/EXP_INDEX.md`** first to identify the relevant experiment(s).
2. **Load `experiments/EXP_XXX/summary.md`** for full details.
3. If Airtable data exists, load `experiments/EXP_XXX/airtable_*.json`.

## Experiment Conventions

Every experiment folder **must** contain these 4 files (see `experiments/EXPERIMENT_TEMPLATE.md`):

| File | Purpose |
|------|---------|
| `summary.md` | High-level overview, goals, current status, results |
| `LOG.md` | Chronological, append-only log of every action and change |
| `SCRIPT_INDEX.md` | Index of all scripts, firmware, data files, and artifacts |
| `DOC_INDEX.md` | Index of all markdown/documentation files |

**Mandatory rules when working inside an experiment:**

1. **Log everything** — every action, file creation, analysis, or change **must** be appended to `LOG.md` with a date heading (`## YYYY-MM-DD — Description`).
2. **Keep summary current** — after significant changes, update `summary.md` to reflect the latest state.
3. **Index new files** — when creating scripts or data files, add them to `SCRIPT_INDEX.md`. When creating `.md` files, add them to `DOC_INDEX.md`.
4. **Use the template** — when scaffolding a new experiment, use `/create-experiment` or follow `experiments/EXPERIMENT_TEMPLATE.md`.
5. **Sync to Notion** — after updating an experiment locally, **always** sync changes to Notion. Use `python3 scripts/push_experiment_to_notion.py EXP_XXX` to push all `.md` files to the experiment's Notion page. This clears the page, creates a "Lab Documents" child database with each `.md` file as an entry, and populates the main page with `summary.md`.
6. **Cross-link between files** — whenever a markdown file references another markdown file, script, or figure, **always use a proper markdown link**. Use relative paths so links work in the experiment viewer:
   - To another md file: `[REPORT.md](REPORT.md)` or `[LOG.md](LOG.md)`
   - To a script: `[marimo_bio.py](model/marimo_bio.py)`
   - To an interactive figure: `[Exp 1 plot](figures/exp1_light_dark_cycle.html)`
   - To a static figure image: `![caption](figures/exp1_light_dark_cycle.png)`
   - Never leave a bare filename like `REPORT.md` — always wrap it in `[REPORT.md](REPORT.md)`

### ⚠️ Mandatory Exit Gate — Verify Before Completing ANY Task

**Before reporting task completion to the user**, if you created or modified ANY files inside `experiments/`, you **MUST** verify all of the following. Do NOT skip this step.

1. **LOG.md updated** — a new dated entry (`## YYYY-MM-DD — ...`) was appended for this session's work.
2. **SCRIPT_INDEX.md current** — every `.py`, `.cpp`, `.ato`, `.csv`, `.json`, `.ipynb` file in the experiment folder is listed. If it still says `_No scripts yet._` but scripts exist, **fix it now**.
3. **DOC_INDEX.md current** — every `.md` file in the experiment folder is listed in the table.
4. **summary.md accurate** — the `**Status:**` field reflects the actual state (e.g. "In progress", "Complete", "Blocked", "Inconclusive").
5. **summary.md has required sections** — `## Overview`, `## Goal`, `## Progress`, `## Results`, `## References` must all exist.
6. **EXP_INDEX.md consistent** — if the experiment's title, status, or description changed, update its entry in `experiments/EXP_INDEX.md`.
7. **Project summary updated** — if this experiment belongs to a project (`projects/*/summary.md`), ensure it appears in the project's experiment table.

If any check fails, **fix it before reporting completion**. This gate is non-negotiable.

## Design Guidelines

When building or modifying any UI in this workspace, follow the shared design language documented in **`.agent/DESIGN_GUIDELINES.md`**. This covers the VS Code-inspired dark theme, color tokens, typography, component patterns, and a checklist for new UIs. The reference implementation is `applications/fab-planner/app/globals.css`.

## Credentials

Stored in `config.yaml` (gitignored). Placeholders in `.env.example`.
