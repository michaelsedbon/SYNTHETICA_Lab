---
description: Search the web for open grant calls and populate the Grant Tracker app
---

# Search Grants Workflow

Use this workflow to find open calls and populate the Grant Tracker database.

## Prerequisites

- Grant Tracker running on port 3009
- User provides search criteria (project keywords, domain, region, etc.)

## Steps

### 1. Understand the search scope

Ask the user what they're looking for:
- Which project(s) the grants should fit (e.g. "Cryptographic Beings", "Bio Electronic Music")
- Domain keywords (e.g. "art-science", "bioelectronics", "synthetic biology")
- Region/eligibility (e.g. "EU", "France", "international")
- Funding range preferences
- Deadline requirements (e.g. "within 6 months")

### 2. Search for grants

Use `search_web` with targeted queries:
```
"open call" OR "grant" OR "funding" [domain keywords] [year] site:europa.eu OR site:anr.fr OR site:erc.europa.eu
```

Example queries:
- `art science open call 2026 EU funding`
- `synthetic biology grant application deadline 2026`
- `bioelectronics research funding EU horizon`
- `creative industries grant France 2026`

### 3. Read and extract details

For each promising result, use `read_url_content` to scrape:
- **Name** of the call
- **Funder** organisation
- **Deadline** (parse to ISO date)
- **Amount** range (include currency)
- **Duration** (months)
- **Eligibility** criteria
- **Tags** (comma-separated keywords)
- **URL** of the call page
- **Description** (first paragraph or summary)
- **TRL level** if mentioned

### 4. Create the grant via API

```bash
curl -X POST http://localhost:3009/api/grants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Call Name",
    "funder": "Organisation",
    "description": "Brief description",
    "amount": "€50,000 – €100,000",
    "amountMin": 50000,
    "amountMax": 100000,
    "currency": "EUR",
    "deadline": "2026-06-15",
    "duration": "24 months",
    "url": "https://...",
    "eligibility": "Open to EU researchers",
    "trlLevel": "1-4",
    "tags": "art,science,bioelectronics"
  }'
```

### 5. Link to relevant project(s)

```bash
curl -X POST http://localhost:3009/api/project-grants \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project-uuid>",
    "grantId": "<grant-uuid>",
    "status": "identified",
    "matchScore": 3
  }'
```

### 6. Report findings

Summarise what was found, how many grants were added, and which projects they were linked to.

## Known Grant Sources

Priority sources to search:
- **EU:** Horizon Europe, ERC, MSCA, Creative Europe, STARTS
- **France:** ANR, BPI France, Région Île-de-France, DRAC
- **Art-Science:** Ars Electronica, STARTS Prize, Wellcome Trust, S+T+ARTS
- **Biotech:** EIT Health, Novo Nordisk Foundation, Gates Foundation
- **General:** Fondation de France, FEDER, Interreg

## Tips

- New grants are created with `seen: false` by default — they show a glowing **NEW** badge in the UI until the user opens them
- Set `matchScore` based on how well the call fits:  1=loose, 3=moderate, 5=perfect
- Use `archived: false` for active calls (default)
- After finding grants, tell the user so they can review in the "All Grants" view
- The user can right-click a grant → "Mark as new" to revert if they skimmed too fast
