# 🔬 Research Scout — E2E Audit

**Date:** 2026-03-07 · **Status:** ✅ **PASS** (all 6 pages)  
**URL:** `http://localhost:3003`

---

## Round 1 — Smoke Test (4 pages)

| Page | Status |
|------|--------|
| Dashboard `/` | ✅ |
| Papers `/papers` | ✅ |
| People `/people` | ✅ |
| Topics `/topics` | ✅ |

## Round 2 — Deep Test (6 pages + interactions)

| Feature | Status | Details |
|---------|--------|---------|
| Dashboard stats | ✅ | 1892 papers, 9076 authors, 10 topics |
| Dashboard heatmap | ✅ | Co-occurrence matrix interactive on hover/click |
| Papers by Topic chart | ✅ | Horizontal bar chart accurate |
| Papers search | ✅ | "AlphaFold" → 3 results |
| Papers topic filter | ✅ | "AI for Wetlab" → 202 papers |
| Paper detail link | ✅ | Opens OpenAlex page |
| People rankings | ✅ | George M. Church #1 |
| People country filter | ✅ | "JP" → Shoji Takeuchi #1 |
| CSV export | ✅ | Export triggered |
| Author profile | ✅ | Shoji Takeuchi — timeline, co-authors, papers |
| Topics list | ✅ | 10 topics with query counts |
| Topic scrape trigger | ✅ | "AI for Wetlab" scrape started |
| Niche map `/niche-map` | ✅ | 1307 papers on 2D UMAP projection with topic coloring |
| Console errors | ✅ | None |

## Screenshots

````carousel
![Dashboard with heatmap](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/scout_deep_heatmap_1772901679553.png)
<!-- slide -->
![Papers filtered](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/scout_deep_papers_filter_1772901763890.png)
<!-- slide -->
![Author profile](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/scout_deep_author_profile_1772901932703.png)
<!-- slide -->
![Topics with scrape](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/scout_deep_topics_1772901985935.png)
<!-- slide -->
![Niche map UMAP](/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/audits/scout_deep_niche_map_1772902037232.png)
````
