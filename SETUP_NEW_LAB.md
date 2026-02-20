# Setting Up a New Lab Folder

This guide walks you through cloning this scaffolding for a new lab project.

## 1. Copy the scaffold

Copy the entire repository to a new folder:

```bash
cp -r SYNTHETIC_PERSONAL_LAB/ NEW_LAB_NAME/
cd NEW_LAB_NAME
```

Then clean out lab-specific data:
```bash
rm -rf experiments/EXP_*  papers/ papers_txt/*.txt
# Keep INDEX.md headers, EXP_INDEX.md headers, and scripts
```

## 2. Create `config.yaml`

Copy the template and fill in your credentials:

```bash
cp .env.example config.yaml
```

Edit `config.yaml` to match this format:
```yaml
notion:
  token: "ntn_your_token_here"
  lab_notebook_db: "your_lab_notebook_database_id"
  bibliography_db: "your_bibliography_database_id"

airtable:
  token: "pat_your_token_here"
  base_id: "appYourBaseId"
```

**Where to get these:**
- **Notion token** → [notion.so/my-integrations](https://www.notion.so/my-integrations)
- **Notion DB IDs** → Open each database, copy the 32-char ID from the URL
- **Airtable token** → [airtable.com/create/tokens](https://airtable.com/create/tokens)
- **Airtable Base ID** → From the Airtable URL (`appXXXXXXXX`)

## 3. Share Notion Integration

In each Notion database:
1. Click `...` → **Connections** → Add your integration

## 4. Update docs

Update these files with your new lab's IDs and links:

| File | What to update |
|------|---------------|
| `.agent/MANIFEST.md` | Database IDs in the "Key Data Sources" table |
| `CHEATSHEET.md` | Notion and Airtable URLs |
| `README.md` | Lab name and description |

## 5. Verify

```bash
pip3 install requests pyyaml pymupdf
python3 scripts/notion_client.py --test
```

You should see ✅ for both Lab Notebook and Bibliography connections.

## 6. First sync

```bash
python3 scripts/sync_bibliography.py
python3 scripts/sync_experiments.py
```

Or use the AI assistant command: `/catch-up`

## What's Portable (no changes needed)

- ✅ All Python scripts (`scripts/`) — use relative paths
- ✅ All AI workflows (`.agent/workflows/`) — workspace-relative
- ✅ `.gitignore` — generic
- ✅ `.env.example` — documents required vars
- ✅ `applications/` structure and launcher
