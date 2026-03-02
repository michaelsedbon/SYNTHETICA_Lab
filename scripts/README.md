# Scripts

Python utilities for syncing data between local files, Notion, Airtable, and external APIs. All scripts use `config.yaml` for API credentials and relative paths from the project root.

## Dependencies

```bash
pip3 install requests pyyaml pymupdf
```

---

## Script Reference

### `notion_client.py` — Shared Notion API Client

Core library imported by other scripts. Provides:

- `query_database(db_id)` — Paginated database queries
- `get_page_content_as_markdown(page_id)` — Convert Notion blocks → markdown
- `download_file(url, path)` — Download Notion S3 attachments
- `create_page(db_id, properties)` — Create pages in a database
- `append_blocks_to_page(page_id, blocks)` — Append blocks to a page

```bash
python3 scripts/notion_client.py --test   # Test API connection
```

---

### `sync_bibliography.py` — Bibliography Sync

Downloads PDFs from the Notion bibliography database, extracts text, and updates `papers_txt/INDEX.md`.

```bash
python3 scripts/sync_bibliography.py          # Sync new papers
python3 scripts/sync_bibliography.py --list   # List all papers
```

**Flow:** Notion Bibliography → `papers/*.pdf` → `papers_txt/*.txt` → `papers_txt/INDEX.md`

---

### `sync_experiments.py` — Experiment Sync

Syncs experiment pages from the Notion Lab Notebook, creating local folders with `summary.md`. Also fetches linked Airtable data if present.

```bash
python3 scripts/sync_experiments.py          # Sync new experiments
python3 scripts/sync_experiments.py --list   # List all experiments
python3 scripts/sync_experiments.py --force  # Re-sync (overwrite)
```

**Flow:** Notion Lab Notebook → `experiments/EXP_XXX/summary.md` → `experiments/EXP_INDEX.md`

---

### `push_experiment_to_notion.py` — Push Experiment to Notion

Pushes local experiment markdown files **back** to Notion. Clears the existing page, creates a "Lab Documents" child database with each `.md` file as an entry, and writes `summary.md` as the main page body. Supports image uploads via catbox for embedding.

```bash
python3 scripts/push_experiment_to_notion.py EXP_002            # Push to Notion
python3 scripts/push_experiment_to_notion.py EXP_002 --dry-run   # Preview without modifying
```

**Key features:**
- Full markdown → Notion block conversion (headings, tables, code blocks, lists, images)
- Inline formatting: bold, italic, code, links
- Image upload to catbox for Notion embedding
- Rich text truncation to stay within Notion's 2000-char limit

---

### `fetch_airtable.py` — Airtable Data Fetcher

Fetches table records from the Airtable inventory base (reagents, labware, strains).

```bash
python3 scripts/fetch_airtable.py --test                  # Test connection, list tables
python3 scripts/fetch_airtable.py Reagents                # Fetch single table → JSON
python3 scripts/fetch_airtable.py Reagents output.json    # Fetch to specific file
python3 scripts/fetch_airtable.py --all .                 # Fetch all tables → JSON files
```

---

### `fetch_papers.py` — Sci-Hub PDF Downloader

Downloads missing PDFs via Sci-Hub for papers in the Notion bibliography. Extracts DOIs from URLs (supports 10+ publisher formats), tests mirror health in parallel, and downloads with rate limiting.

```bash
python3 scripts/fetch_papers.py                      # Download missing PDFs
python3 scripts/fetch_papers.py --dry-run             # Preview without downloading
python3 scripts/fetch_papers.py --filter "retina"     # Filter by title keyword
python3 scripts/fetch_papers.py --force               # Re-download all
python3 scripts/fetch_papers.py --check-mirrors       # Test mirror health only
```

**DOI extraction:** Handles doi.org, Science, PLoS, Nature, Elsevier, PubMed, Springer, Wiley, Cell, ACS, biorxiv, PMC, Cambridge, and generic DOI patterns.

---

### `explore_paper_network.py` — Citation Network Explorer

Maps the citation network around seed papers using the Semantic Scholar API. Retrieves citations, references, and ML-based recommendations, then filters and ranks by keywords, citation count, and year.

```bash
python3 scripts/explore_paper_network.py --doi "10.1126/scirobotics.adk8019" \
    --keywords "mycelium,fungal" --min-citations 5 --output report.md
```

**Capabilities:** Multi-seed overlap detection, keyword filtering, markdown report generation, formatted terminal tables.

---

### `pdf_to_text.py` — PDF Text Extraction

Extracts text from PDFs using PyMuPDF (fitz). Used by `sync_bibliography.py` as a library function.

```bash
python3 scripts/pdf_to_text.py paper.pdf                  # Single file
python3 scripts/pdf_to_text.py paper.pdf output_dir/       # Custom output dir
python3 scripts/pdf_to_text.py --batch papers/             # Batch convert directory
```

---

### `read_index.py` — Paper Summary Reader

Searches `papers_txt/INDEX.md` by keyword and reads the matching summary aloud using macOS `say`.

```bash
python3 scripts/read_index.py "bacteriorhodopsin"
```

---

## Fusion 360 Add-In

### `fusion360/ExportComponent/`

Fusion 360 script that exports a selected component in multiple formats:

| Format | Output |
|--------|--------|
| STL | Mesh (medium refinement) |
| STEP | CAD interchange |
| F3D | Fusion archive |
| DXF | Flat pattern (sheet metal only) |

**Usage:** In Fusion 360 → Utilities → Scripts and Add-Ins → Run `ExportComponent`. Select a component, choose an output folder, and all formats are exported to a named subfolder.
