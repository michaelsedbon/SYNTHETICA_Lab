---
description: Generate proposal PDF and InDesign IDML from the grant tracker
---

# Generate Proposal PDF + IDML

This workflow produces PDF (multi-quality) and InDesign IDML files from grant proposal data.

## Prerequisites

```bash
cd applications/grant-tracker/pdf-generator
pip install -r requirements.txt   # reportlab, Pillow, PyYAML
```

## Steps

### Generate from JSON data

// turbo
1. Navigate to the pdf-generator directory:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/grant-tracker/pdf-generator
```

2. Generate PDF + IDML:
```bash
python generator.py --input <proposal.json> --output output/<name>.pdf --idml
```

This produces:
- `output/<name>_lossless.pdf` — max quality
- `output/<name>_standard.pdf` — 200 dpi for print
- `output/<name>_compressed.pdf` — 120 dpi, smallest
- `output/<name>.idml` — InDesign-editable package

### Generate sample (for testing)

// turbo
3. Generate a test PDF + IDML with sample data:
```bash
python generator.py --sample --idml --output output/test.pdf
```

### Single quality tier

4. If you only need one quality:
```bash
python generator.py --input <data.json> --output output/<name>.pdf --quality lossless
```

Options: `lossless`, `standard`, `compressed`, `all` (default)

## Notes

- **Image caching**: PNG/TIFF/BMP images are auto-converted to JPG and cached in `output/img_cache/`. No manual conversion needed.
- **Design rules**: All visual rules live in `design_system.yaml`. Edit ONLY this file to change design.
- **IDML images**: The IDML uses file-path references for images. Keep source images accessible for InDesign to link them.
- **Fonts**: Place Helvetica Neue `.ttf` files in `fonts/`. Falls back to Helvetica if missing.
