---
description: Sync papers from Zotero into organized local directories with text extraction and tiered indexes
---

# Sync Papers from Zotero

// turbo-all

Syncs the SYNTHETICA Zotero collection into `papers/` (PDFs) and `papers_txt/` (extracted text), organized by sub-collection.

## Prerequisites

- Python 3 with `requests`, `pyyaml`, `pymupdf` installed
- `config.yaml` at project root with Zotero credentials
- Zotero top-level collection key: `FX6FTD5N`

## Steps

1. Run the sync script:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB
python3 .agents/scripts/sync_zotero_papers.py
```

This will:
- Fetch all sub-collections under the SYNTHETICA collection
- Download missing PDFs from Zotero
- Extract text from PDFs using PyMuPDF
- Generate per-collection `INDEX.md` files
- Generate top-level `CATALOG.md`

2. To preview without downloading:
```bash
python3 .agents/scripts/sync_zotero_papers.py --dry-run
```

3. To list collections and paper counts:
```bash
python3 .agents/scripts/sync_zotero_papers.py --list
```

4. To rebuild indexes from existing files (no download):
```bash
python3 .agents/scripts/sync_zotero_papers.py --rebuild
```

5. To extract text from a single PDF:
```bash
python3 .agents/scripts/pdf_to_text.py path/to/paper.pdf [output_dir]
```

6. To batch-extract text from all PDFs:
```bash
python3 .agents/scripts/pdf_to_text.py --batch papers/ papers_txt/
```

## Directory Structure After Sync

```
papers/
├── bioelectronics/          # Bio-electronic interfaces, MEAs, retinas
├── fungal_computing/        # Mycelium electrophysiology
├── material_computing/      # Polymer gel computation & memory
└── ultrasound_biology/      # Focused ultrasound gene expression

papers_txt/
├── CATALOG.md               # Top-level index (read this first)
├── bioelectronics/
│   └── INDEX.md             # Per-collection summaries
├── fungal_computing/
│   └── INDEX.md
├── material_computing/
│   └── INDEX.md
└── ultrasound_biology/
    └── INDEX.md
```

## Zotero Configuration

Credentials are in `config.yaml` at project root:

```yaml
zotero:
  api_key: "..."
  library_id: "8723725"
  library_type: "user"
  top_collection_id: "FX6FTD5N"
  subcollections:
    bioelectronics: "43SW3NBP"
    fungal_computing: "HZTFXCGC"
    material_computing: "D75V54UH"
    ultrasound_biology: "ZZ72732G"
```

## Adding a New Sub-Collection

1. Create a new sub-collection in Zotero under "Synthetica"
2. Add papers to that sub-collection
3. Run the sync — it will auto-create the local directory
4. Update `config.yaml` subcollections with the new key

## Related Scripts

| Script | Purpose |
|--------|---------|
| `.agents/scripts/sync_zotero_papers.py` | Main sync: Zotero → local files + indexes |
| `.agents/scripts/pdf_to_text.py` | PDF → text extraction (PyMuPDF) |
