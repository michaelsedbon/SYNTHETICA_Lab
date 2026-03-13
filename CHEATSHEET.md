# Lab Cheat Sheet

Quick reference for everything in the SYNTHETICA Lab.

## 🤖 Slash Commands

Tell the AI assistant any of these to trigger a workflow:

### Day-to-Day
| Command | What it does |
|---------|-------------|
| `/catch-up` | Sync everything (bibliography + experiments + projects) and report what's new |
| `/audit-docs` | Scan all experiments, apps, and projects — report documentation gaps |
| `/preview-markdown` | Open any markdown file in the Experiment Viewer |

### Experiments
| Command | What it does |
|---------|-------------|
| `/create-experiment` | Scaffold a new experiment folder with all 4 template files |
| `/update-experiment` | Append notes/data to an experiment and sync to Notion |
| `/sync-experiments` | Sync new experiments from Notion |
| `/sync-projects` | Refresh project experiment lists from Notion |

### Bibliography
| Command | What it does |
|---------|-------------|
| `/sync-bibliography` | Download new papers from Notion, extract text, summarise |

### Applications
| Command | What it does |
|---------|-------------|
| `/create-app` | Scaffold a new application (Next.js + FastAPI) |
| `/deploy` | Commit, push, and deploy to server (172.16.1.80) |
| `/push-app` | Push changes to one app submodule |
| `/push-all-apps` | Push all modified app submodules |
| `/pull-apps` | Pull latest for all app submodules |

### Hardware & Projects
| Command | What it does |
|---------|-------------|
| `/design-pcb` | Full PCB pipeline — literature, tiered design, sourcing, Atopile schematic |
| `/ota-update` | Flash firmware to ESP devices over WiFi |
| `/convert-heic` | Convert HEIC images to JPG |
| `/update-knowledge-base` | Update a project's knowledge base after changes to hardware, firmware, APIs, or software |

## 📚 Project Knowledge Bases

Each project in `projects/` has a `knowledge/` directory with structured documentation. When working on an experiment, check which project it belongs to and read `projects/<project>/knowledge/GUIDE.md` for the structure and rules. **If your work changes hardware, firmware, or APIs, update the knowledge base** (or run `/update-knowledge-base`).

### Agent & Skills
| Command | What it does |
|---------|-------------|
| `/install-skill` | Install or remove skills from the central library |
| `/deploy-agent-gemini` | Deploy the lab agent with Gemini architecture |

## 📝 Notion Dashboard
- **[Lab Notebook](https://www.notion.so/30a165923a21808ea1d1cdf715e76b89)** — Active experiments and protocols.
- **[Bibliography](https://www.notion.so/23b165923a2180eea5d2ebc0f10ef03e)** — Research papers and reading list.
- **[Notion Integrations](https://www.notion.so/my-integrations)** — Manage the Lab Assistant API token.

## 📊 Airtable Dashboard
- **[Inventory Base](https://airtable.com/appS6rrpVWIV28yFh)** — Reagents, Labware, and Strains.
- **[Airtable Personal Access Tokens](https://airtable.com/create/tokens)** — Manage API access tokens.

## 🛠 Python Scripts (manual)
- `python3 scripts/sync_experiments.py` — Sync Notion experiments.
- `python3 scripts/sync_bibliography.py` — Sync Notion bibliography.
- `python3 scripts/push_experiment_to_notion.py EXP_XXX` — Push experiment docs to Notion.
- `python3 scripts/fetch_airtable.py --test` — Test Airtable connection.
- `python3 scripts/read_index.py "Title"` — Read a paper summary aloud.
