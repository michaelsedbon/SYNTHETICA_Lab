# SYNTHETICA Personal Lab

AI-assisted lab workspace for the SYNTHETICA project. Integrates with Notion (lab notebook + bibliography) and Airtable (reagents & labware inventory).

See the **[Cheat Sheet](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/CHEATSHEET.md)** for quick links to Notion and Airtable dashboards.

## Setup

### 1. Credentials

All credentials are stored in **`config.yaml`** (gitignored). Copy from the template:

```bash
cp .env.example .env   # Reference for required variables
```

The `config.yaml` file contains:
- **Notion Integration Token** — from [notion.so/my-integrations](https://www.notion.so/my-integrations)
- **Notion Database IDs** — Lab Notebook + Bibliography
- **Airtable Token** — from [airtable.com/create/tokens](https://airtable.com/create/tokens)
- **Airtable Base ID**

### 2. Python Dependencies

```bash
pip3 install requests pyyaml pymupdf
```

### 3. Notion Integration Sharing

Make sure the Notion integration is connected to both databases:
1. Open each database in Notion
2. Click "..." → "Connections" → Add your integration

## Usage

### Sync Bibliography (new papers)
```bash
python3 scripts/sync_bibliography.py        # Download new papers
python3 scripts/sync_bibliography.py --list  # List all papers
```

### Sync Experiments (new entries)
```bash
python3 scripts/sync_experiments.py          # Sync new experiments
python3 scripts/sync_experiments.py --list   # List all experiments
python3 scripts/sync_experiments.py --force  # Re-sync all
```

### Fetch Airtable Data
```bash
python3 scripts/fetch_airtable.py --test     # Test connection
python3 scripts/fetch_airtable.py Reagents   # Fetch reagents table
python3 scripts/fetch_airtable.py --all .    # Fetch all tables
```

### AI Assistant Workflows

When working with the AI assistant (Antigravity), use these commands:
- **`/catch-up`** — Sync everything and report what's new
- **`/sync-bibliography`** — Sync bibliography only
- **`/sync-experiments`** — Sync experiments only

## Project Structure

```
SYNTHETIC_PERSONAL_LAB/
├── .agent/                    # AI assistant config (MANIFEST, workflows, skills)
│   ├── MANIFEST.md            # Project memory — read every conversation
│   ├── conventions.md         # Rules for the AI assistant
│   ├── workflows/             # 9 slash-command workflows (/deploy, /catch-up, …)
│   └── skills/                # 3 extended skills (fetch-papers, explore-network, …)
├── applications/              # 7 web applications (see applications/INDEX.md)
│   ├── INDEX.md               # App registry with ports, stacks, and status
│   ├── fab-planner/           # Production planning (Next.js + Prisma + Three.js)
│   ├── adc24-dashboard/       # Electrophysiology dashboard (FastAPI + Next.js)
│   ├── experiment-viewer/     # Experiment notebook browser (FastAPI + Next.js)
│   ├── research-scout/        # Interdisciplinary research mapper (FastAPI + Next.js)
│   ├── plasmid-viewer/        # GenBank plasmid map viewer (FastAPI + Next.js)
│   ├── virtual-lab/           # 3D lab model with Airtable inventory (Three.js)
│   └── launcher/              # Central app dashboard (Next.js)
├── config.yaml                # API credentials (gitignored)
├── scripts/                   # Python sync & utility scripts (see scripts/README.md)
├── papers/                    # Downloaded reference PDFs (user's collection)
├── papers_txt/                # Plain-text extracts of user PDFs
│   └── INDEX.md               # Paper index for AI lookup
├── agent_papers/              # PDFs downloaded by AI assistant
├── agent_papers_txt/          # Text extracts of AI-downloaded papers
│   └── INDEX.md               # AI paper index
├── experiments/               # Per-experiment folders (see experiments/README.md)
│   ├── EXP_INDEX.md           # Experiment index for AI lookup
│   ├── EXPERIMENT_TEMPLATE.md # Template for new experiments
│   └── EXP_001…003/           # Individual experiment data
├── Project_space/             # Hardware design files & CAD assets
│   └── Cryptographic_beings/  # Motor controller PCB (KiCad, SKiDL)
├── Software/                  # Reference manuals & datasheets
├── CHEATSHEET.md              # Quick links to Notion & Airtable
├── SETUP_NEW_LAB.md           # Guide for cloning this scaffold
└── README.md                  # This file
```

## Deployment

The production server runs at `172.16.1.80` (SSH key auth, user `michael`, repo at `/opt/synthetica-lab/`). Use `/deploy` to commit, push, and pull on the server. See `.agent/workflows/deploy.md` for full details including service restart commands.
