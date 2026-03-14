# AI Assistant Configuration

This directory configures the AI lab assistant (Antigravity) for the SYNTHETICA workspace. The assistant uses these files to maintain context, follow conventions, and execute repeatable workflows.

## Files

| File | Purpose |
|------|---------|
| `MANIFEST.md` | **Persistent memory** — project type, data source IDs, schemas, key directories, experiment conventions. Read at the start of every conversation. |
| `conventions.md` | **Rules** — check workflows before building new scripts; check `.agent/` before infrastructure tasks; production server is at `172.16.1.80`. |
| `DESIGN_GUIDELINES.md` | **UI design system** — VS Code dark theme tokens, typography, component patterns, layout conventions. Reference when building or modifying any UI. |

## Workflows

Slash-commands the user can invoke. Located in `workflows/`:

| Command | Description |
|---------|-------------|
| `/orient` | Orient in a new conversation — read persistent memory files |
| `/end-of-day` | End-of-day memory update — refresh AGENT_STATE.md |
| `/catch-up` | Sync bibliography + experiments from Notion, report what's new |
| `/sync-bibliography` | Sync bibliography only (download PDFs, extract text, update INDEX) |
| `/sync-experiments` | Sync experiments only |
| `/sync-projects` | Sync project summaries — refresh experiment lists from Notion |
| `/create-experiment` | Scaffold a new experiment folder with all 4 template files |
| `/update-experiment` | Append notes/data to an experiment and sync to Notion |
| `/create-app` | Scaffold a new application (Next.js + FastAPI) |
| `/deploy` | Commit, push, and deploy to production server (`172.16.1.80`) |
| `/push-app` | Push changes to one app submodule |
| `/push-all-apps` | Push all modified app submodules |
| `/pull-apps` | Pull latest for all app submodules |
| `/deploy-agent-gemini` | Deploy the lab agent with Gemini architecture |
| `/install-skill` | Install or remove skills from central library |
| `/ota-update` | Build and flash ESP firmware over WiFi via PlatformIO OTA |
| `/preview-markdown` | Open any markdown file in the Experiment Viewer |
| `/design-pcb` | Multi-step PCB design pipeline |
| `/edit-pcb` | PCB edit mode — modify .ato files, rebuild |
| `/convert-heic` | Convert HEIC images to JPG |
| `/audit-docs` | Audit all experiments, apps, projects — report gaps |
| `/update-knowledge-base` | Update project knowledge base after changes |

### Turbo Mode

Workflows annotated with `// turbo-all` allow the AI assistant to auto-run all shell commands without user confirmation. Most workflows use this for speed.

## Skills

Extended capabilities in `skills/`:

| Skill | Description |
|-------|-------------|
| `fetch-papers` | Download PDFs from Sci-Hub via DOI. Uses `scripts/fetch_papers.py`. |
| `explore-paper-network` | Map citation networks using Semantic Scholar API. Uses `scripts/explore_paper_network.py`. |
| `verify-paper-claims` | Download a paper, extract text, verify claims against content before citing. |
