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
├── .agent/                    # AI assistant config
│   ├── MANIFEST.md            # Project memory
│   └── workflows/             # Slash-command workflows
├── config.yaml                # API credentials (gitignored)
├── scripts/                   # Python sync scripts
├── papers/                    # Downloaded reference PDFs
├── papers_txt/                # Plain-text extracts
│   └── INDEX.md               # Paper index for AI lookup
├── experiments/               # Per-experiment folders
│   ├── EXP_INDEX.md           # Experiment index for AI lookup
│   └── EXP_001/               # Individual experiment data
└── README.md                  # This file
```
