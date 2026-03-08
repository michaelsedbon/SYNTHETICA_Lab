# 🧬 Plasmid Viewer — E2E Audit

**Date:** 2026-03-07 · **Status:** ✅ **PASS**  
**URL:** `http://localhost:3004`

---

## Round 1 — Smoke Test

| Check | Result |
|-------|--------|
| Page loads | ✅ |
| 3-panel layout | ✅ |
| Circular map | ✅ |
| Linear view | ✅ |
| Annotations tab | ✅ |

## Round 2 — Deep Test

| Feature | Status | Details |
|---------|--------|---------|
| Load sequence | ✅ | pUC19_test loads from sidebar |
| Circular map zoom | ✅ | Via UI zoom buttons |
| Circular map rotation | ✅ | Via scroll interaction |
| Linear view tab | ✅ | Renders with annotation overlays |
| Annotations table | ✅ | All features listed, searchable |
| Edit annotation | ✅ | Renamed `lac promoter` → saved |
| Delete annotation | ✅ | Removed via sidebar Delete button |
| ORF detection | ✅ | Found 8 ORFs, applied as new annotations (7 → 15) |
| Sequence duplicate | ✅ | Via right-click context menu |
| Sequence rename | ✅ | Via right-click context menu |
| Sequence delete | ✅ | Via right-click context menu |
| Folder creation | ✅ | New folder in project tree |
| GenBank upload button | ✅ | Import button + hidden file input verified |
| Console errors | ✅ | None |

### Not Tested
- Manual "Add Feature" form (not found as standalone; covered by ORF → Apply workflow)
- GenBank file upload (requires native file picker)

## Screenshots

````carousel
![Circular map](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/plasmid_viewer_final_circular_1772899301050.png)
<!-- slide -->
![Linear view](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/plasmid_viewer_linear_view_1772899285171.png)
<!-- slide -->
![Annotations table](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/plasmid_viewer_annotations_view_1772899287922.png)
````
