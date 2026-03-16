---
description: Search the web for open grant calls and populate the Grant Tracker app
---

# Search Grants Workflow

// turbo-all

Comprehensive workflow for finding funding opportunities across art, science, design, and interdisciplinary domains. Reads project context from the Grant Tracker, searches known databases and the web, deduplicates against existing grants, and adds new opportunities via API.

## Applicant Profile

Keep this profile in mind when scoring relevance:

| Attribute | Value |
|-----------|-------|
| **Name** | Michael Sedbon |
| **Base** | France (Paris area) |
| **Roles** | Artist, Designer, Engineer, Scientist |
| **Strengths** | Strong art awards track record, engineering, design, interdisciplinary projects |
| **Weakness** | Limited scientific publication record — cannot lead pure-science grants alone |
| **Affiliation** | Independent (no university/lab currently) |
| **Strategy** | Can lead art/design grants solo. For research grants: needs scientific collaborator as PI |
| **Target regions** | France, EU, Israel, US |
| **Min amount** | €5,000 |
| **Languages** | English, French |
| **Domains** | Bio-art, bioelectronics, synthetic biology, living materials, sound art, digital fabrication, cryptography, focused ultrasound, generative art |

## Steps

### 1. Load context from Grant Tracker

Read all data needed for context and deduplication:

```bash
# Get all projects (for relevance matching and project linking)
curl -s http://localhost:3009/api/projects

# Get ALL grants including archived (for deduplication)
curl -s "http://localhost:3009/api/grants?archived=all"

# Get user profile
curl -s http://localhost:3009/api/profile
```

From each project, extract:
- Name, description (key themes/technologies)
- Existing bibliography topics
- Partners and their expertise

Build a mental model of what the user is working on and what funding would be relevant.

### 2. Load the source registry

Read the database registry:

```
.agents/data/GRANT_SOURCES.md
```

Identify which sources are **due for checking**:
- `weekly` sources: check if last checked > 7 days ago
- `biweekly` sources: check if last checked > 14 days ago
- `monthly` sources: check if last checked > 30 days ago
- `never` sources: always check these first

Prioritise: check `never` first, then overdue sources, then others.

### 3. Search for grants

For each source that is due:

**a) Direct source search:**
Use `read_url_content` to visit the source URL and look for current open calls.
If the page loads, extract any visible opportunities.
If it fails or requires login, note it in the source registry and fall back to web search.

**b) Web search for that source:**
Use `search_web` with targeted queries:
```
"[source name]" open call 2026
"[source name]" appel à projets 2026
"[source name]" grant application deadline
```

**c) Broad domain searches:**
Also run broader searches combining project themes with funding keywords:
```
art science open call 2026 bioelectronics
bio-art residency 2026 open call
"appel à projets" art numérique 2026
synthetic biology art grant EU
focused ultrasound creative grant
living materials art science funding
digital fabrication artist residency 2026
art science collaboration grant Europe
cryptographic art blockchain grant 2026
sound art bioelectronics grant
```

Search in both English AND French:
```
"appel à candidatures" art science 2026
financement art numérique France
résidence artiste scientifique 2026
bourse création numérique
```

**d) Discover new sources:**
If you find a grant listed on a database/portal not in `GRANT_SOURCES.md`, add that new source to the registry with status `new`.

### 4. Extract grant details

For each promising result, use `read_url_content` to scrape the call page and extract:

| Field | Description |
|-------|-------------|
| `name` | Full name of the call |
| `funder` | Funding organisation |
| `description` | Brief summary (1-2 paragraphs) |
| `amount` | Human-readable range (e.g. "€50,000 – €100,000") |
| `amountMin` | Minimum amount in EUR (integer) |
| `amountMax` | Maximum amount in EUR (integer) |
| `currency` | Currency code (EUR, USD, ILS, GBP) |
| `deadline` | ISO date (YYYY-MM-DD) |
| `duration` | Human-readable (e.g. "12 months") |
| `url` | URL of the call page |
| `eligibility` | Key eligibility criteria |
| `trlLevel` | TRL level if mentioned |
| `tags` | Comma-separated keywords |

### 5. Filter and deduplicate

For each extracted grant, apply these filters IN ORDER:

**a) Dedup check — CRITICAL:**
Compare against ALL existing grants (including archived) from Step 1:
1. Exact URL match → **SKIP** (already in DB)
2. Fuzzy name match (>80% similarity) + same funder → **SKIP**
3. Same funder + deadline within 7 days + similar amount → **SKIP** (likely same call)

**b) Amount check:**
- If `amountMax` < 5000 → **SKIP** (below threshold)
- If no amount info, include it anyway (better to review than miss)

**c) Deadline check:**
- If `deadline` < today + 14 days → **SKIP** (too late to apply)
- If deadline has already passed → **SKIP**
- If no deadline (rolling/permanent) → **INCLUDE** (mark in notes)

**d) Eligibility check:**
- If explicitly requires PhD/professor title with no team option → **SKIP**
- If requires institutional affiliation with no workaround → **Note in description** but still include (might find a partner)
- If requires specific nationality not matching → **SKIP**
- Grants that welcome artist+scientist collaborations → **HIGH PRIORITY** — flag in notes

### 6. Add grants via API

For each grant that passes filters:

```bash
curl -X POST http://localhost:3009/api/grants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Call Name",
    "funder": "Organisation",
    "description": "Brief description.\n\n⚠️ Needs scientific collaborator as PI.",
    "amount": "€50,000 – €100,000",
    "amountMin": 50000,
    "amountMax": 100000,
    "currency": "EUR",
    "deadline": "2026-06-15",
    "duration": "24 months",
    "url": "https://...",
    "eligibility": "Open to EU artists and researchers",
    "trlLevel": "1-4",
    "tags": "art,science,bioelectronics,EU",
    "seen": false,
    "archived": false
  }'
```

**Important notes:**
- Grants are created with `seen: false` by default — they show glowing **NEW** badges
- Include collaboration requirements in the description (e.g. "⚠️ Needs scientific collaborator")
- Add relevant tags for filtering

### 7. Link grants to relevant projects

For each added grant, link it to matching projects:

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

**Match scoring guide:**
| Score | Meaning |
|-------|---------|
| 1 | Tangentially related — worth knowing about |
| 2 | Some overlap — could stretch to fit |
| 3 | Good match — relevant themes |
| 4 | Strong match — clear fit with project goals |
| 5 | Perfect — this call seems made for this project |

**Project IDs** (current):
- Cryptographic Beings: `a0af3361-84a2-4b09-8af4-1b38aec7ce70`
- Bio Electronic Music: `06b74db2-e830-43c0-8c84-0d2e9d1b0e6d`
- Ultrasound Bio-Printing: `2c4bde39-76b8-4125-bc4e-4d7811410df0`

Link a grant to **all** projects it could support, not just the best match.

### 8. Update source registry

After searching, update `GRANT_SOURCES.md`:
- Set **Last checked** to today's date for each source you searched
- Update **Status** if a source was unreachable (`broken`) or required login
- Add any newly discovered databases with status `new`

### 9. Write run log

Append a summary to `.agents/data/grant-search-runs.log.md`:

```markdown
## Run: YYYY-MM-DD

- **Sources checked**: X/30
- **Web searches performed**: Y
- **Open calls found**: Z
- **Duplicates skipped**: N
- **Expired/too-soon skipped**: N
- **Below threshold skipped**: N
- **Grants added**: N (with NEW badge)
- **Project links created**: N
  - Cryptographic Beings: N grants
  - Bio Electronic Music: N grants  
  - Ultrasound Bio-Printing: N grants
- **New databases discovered**: N
- **Collaboration-required grants**: N
- **Top opportunities**:
  1. [Grant Name] — €Amount, deadline YYYY-MM-DD (Score: X)
  2. ...
```

### 10. Report to user

Notify the user with:
- Total new grants added
- Top 3-5 most relevant opportunities (with direct app links)
- Any grants that need a scientific collaborator
- Any new databases discovered
- Suggestion for next run date

## Known Project IDs

These may change if projects are added/removed. Always fetch fresh from API in Step 1.

| Project | ID |
|---------|-----|
| Cryptographic Beings | `a0af3361-84a2-4b09-8af4-1b38aec7ce70` |
| Bio Electronic Music | `06b74db2-e830-43c0-8c84-0d2e9d1b0e6d` |
| Ultrasound Bio-Printing | `2c4bde39-76b8-4125-bc4e-4d7811410df0` |

## Delete All Grants (for prototyping)

To clear all grants and start fresh:
```bash
curl -X DELETE http://localhost:3009/api/grants
```
Or use the **Delete All** button in the All Grants view.

## Tips

- Search in both **English and French** — many French calls are only listed in French
- Grants asking for **artist+scientist collaboration** are particularly good for Michael's profile
- The user has partners listed in each project — check those for potential collaborators on science-heavy grants
- Prefer grants that value **interdisciplinary** work, **innovation**, and **art-science** crossover
- When in doubt about relevance, include the grant — the user can archive what's not useful
- The user can right-click a grant → "Mark as new" to revert if they skimmed too fast

## API Reference

All endpoints are on `http://localhost:3009`.

### Grants
```bash
# List all active grants
GET /api/grants

# List all grants including archived
GET /api/grants?archived=all

# Filter by tag or funder
GET /api/grants?tag=bioart
GET /api/grants?funder=Wellcome

# Get a specific grant
GET /api/grants/<id>

# Create a grant (seen: false → NEW badge)
POST /api/grants
Content-Type: application/json
{ "name", "funder", "description", "amount", "amountMin", "amountMax",
  "currency", "deadline", "duration", "url", "eligibility", "trlLevel",
  "tags", "seen": false, "archived": false }

# Update a grant
PUT /api/grants/<id>
Content-Type: application/json
{ field: value, ... }

# Delete ALL grants (prototyping only)
DELETE /api/grants
```

### Project-Grant Links
```bash
# Link a grant to a project
POST /api/project-grants
{ "projectId", "grantId", "status": "identified", "matchScore": 1-5 }

# Update link status/score
PUT /api/project-grants/<id>
{ "status", "matchScore" }
```

### Projects
```bash
GET /api/projects              # List all projects
GET /api/projects/<id>         # Get project with all relations
PUT /api/projects/<id>         # Update project
```

### Other
```bash
GET /api/profile               # User profile
POST /api/bibliography         # Add bibliography entry
POST /api/partners             # Add partner
PUT /api/partners/<id>         # Update partner
```

## Scraper Scripts

Reusable Python scrapers for aggregator sites live in:
```
.agents/scripts/scrapers/
```

Available scrapers:
- `eflux_scraper.py` — Scrapes e-flux announcements for open calls
- `onthemove_scraper.py` — Scrapes On The Move funding database

Usage:
```bash
python3 .agents/scripts/scrapers/eflux_scraper.py
```

Each scraper outputs JSON to stdout with format:
```json
[{ "name", "funder", "deadline", "url", "description", "tags" }, ...]
```
