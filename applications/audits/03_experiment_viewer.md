# 📓 Experiment Viewer — E2E Audit

**Date:** 2026-03-07 · **Status:** ✅ **PASS**  
**URL:** `http://localhost:3002`

---

## Round 1 — Smoke Test

| Check | Result |
|-------|--------|
| Page loads | ✅ |
| Sidebar file tree | ✅ |
| Markdown rendering | ✅ |
| Search | ✅ |
| Breadcrumbs | ✅ |

## Round 2 — Deep Test

| Feature | Status | Details |
|---------|--------|---------|
| Multi-experiment navigation | ✅ | EXP_001, 002, 003, 005 all render correctly |
| Search filtering | ✅ | "EXP_003" filters sidebar accurately |
| Share button | ✅ | Copies link, "Copied!" toast appears |
| Settings page | ✅ | Shows 4 indexed sources, config options |
| Preview mode | ✅ | `?preview=` URL parameter renders arbitrary markdown |
| Sidebar collapse/expand | ✅ | Toggle works |
| Multiple sources | ✅ | Lab, PhD, Applications all visible |
| Breadcrumb navigation | ✅ | Updates dynamically on file selection |
| Deep folder navigation | ✅ | EXP_002 > hardware > OLD_codes traversable |
| Console errors | ⚠️ | Hydration errors (nested p/figure, non-blocking) |

### Not Tested
- Code file viewer with syntax highlighting (no .py files found in accessible tree during test)
- "Open in Editor" button

## Screenshots

![EXP_001 rendered](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/exp_001_render_1772901196733.png)

![Settings page](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/settings_page_1772901433780.png)

![Preview mode](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/preview_mode_test_1772901453519.png)

![Share button clicked](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/share_button_click_1772901493584.png)
