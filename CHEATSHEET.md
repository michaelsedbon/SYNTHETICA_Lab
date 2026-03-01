# Lab Connections Cheat Sheet

Quick links to all the external platforms used in this lab.

## 📝 Notion Dashboard
- **[Lab Notebook](https://www.notion.so/30a165923a21808ea1d1cdf715e76b89)** — Active experiments and protocols.
- **[Bibliography](https://www.notion.so/23b165923a2180eea5d2ebc0f10ef03e)** — Research papers and reading list.
- **[Notion Integrations](https://www.notion.so/my-integrations)** — Manage the Lab Assistant API token.

## 📊 Airtable Dashboard
- **[Inventory Base](https://airtable.com/appS6rrpVWIV28yFh)** — Reagents, Labware, and Strains.
- **[Airtable Personal Access Tokens](https://airtable.com/create/tokens)** — Manage API access tokens.

## 🛠 Lab Assistant Command Summary
- `python3 scripts/sync_experiments.py` — Sync Notion experiments.
- `python3 scripts/sync_bibliography.py` — Sync Notion bibliography.
- `python3 scripts/push_experiment_to_notion.py EXP_XXX` — Push experiment docs to Notion.
- `python3 scripts/fetch_airtable.py --test` — Test Airtable connection.
- `python3 scripts/read_index.py "Title"` — Read a paper summary aloud.
