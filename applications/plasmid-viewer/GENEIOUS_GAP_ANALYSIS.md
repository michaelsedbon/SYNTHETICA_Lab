# Geneious Prime Feature Gap Analysis

Comprehensive comparison of our Plasmid Viewer vs Geneious Prime. Items marked ❌ are candidates for future implementation.

---

## 1. Sequence Viewing

| Feature | Us | Geneious |
|---|---|---|
| Circular map display | ✅ | ✅ |
| Linear display | ✅ | ✅ |
| Smooth zoom + pan | ✅ | ✅ |
| Nucleotide letters at high zoom | ✅ | ✅ |
| Complement strand display | ✅ | ✅ |
| Amino acid translation overlay | ✅ | ✅ |
| **Circular overview inset** (mini-map showing visible region) | ❌ | ✅ |
| **Go-to-base** jump navigation | ❌ | ✅ |
| **Spaced bases** (e.g. every 10 bp) | ❌ | ✅ |
| **GC content / quality graphs** along sequence | ❌ | ✅ |
| **Reading frame selector** (show translation in frame 1/2/3) | ❌ | ✅ |
| **Customizable base colors** (user palette) | ❌ | ✅ |
| **Ruler with customizable tick intervals** | ⚠️ auto | ✅ manual |

## 2. Annotations & Features

| Feature | Us | Geneious |
|---|---|---|
| View/list annotations | ✅ | ✅ |
| Color-coded feature arcs | ✅ | ✅ |
| Inline + curved labels | ✅ | ✅ |
| Select annotation on map | ✅ | ✅ |
| Multi-select + bulk delete | ✅ | ✅ |
| ORF detection | ✅ | ✅ |
| **Add annotation by selection** (drag a region → create feature) | ❌ | ✅ |
| **Edit annotation in-place** (rename, change type, drag endpoints) | ❌ | ✅ |
| **Batch edit annotations** (rename multiple, change type) | ❌ | ✅ |
| **Annotation tracks** (group by type into collapsible tracks) | ❌ | ✅ |
| **Auto-annotate** from database (promoters, terminators, resistance) | ❌ | ✅ |
| **Transfer annotations** between sequences by alignment | ❌ | ✅ |
| **Annotation qualifiers** (notes, db_xref, translation, etc.) | ❌ | ✅ |

## 3. Restriction Analysis

| Feature | Us | Geneious |
|---|---|---|
| **Find restriction sites** on sequence | ❌ | ✅ |
| **Display enzyme cut positions** on circular/linear map | ❌ | ✅ |
| **Filter by cut count** (unique cutters, 2-cutters, etc.) | ❌ | ✅ |
| **Enzyme database** with recognition sequences | ❌ | ✅ |
| **Custom enzyme sets** | ❌ | ✅ |
| **Virtual gel simulation** | ❌ | ✅ |
| **Fragment table** (sizes after digest) | ❌ | ✅ |

## 4. Cloning & Molecular Biology

| Feature | Us | Geneious |
|---|---|---|
| **Restriction cloning simulation** (cut + ligate) | ❌ | ✅ |
| **Golden Gate cloning** | ❌ | ✅ |
| **Gibson Assembly** | ❌ | ✅ |
| **Gateway cloning** | ❌ | ✅ |
| **TOPO cloning** | ❌ | ✅ |
| **In-Fusion cloning** | ❌ | ✅ |
| **Parts cloning** (multi-fragment ligation) | ❌ | ✅ |
| **Cloning lineage tracking** (parent → child) | ❌ | ✅ |
| **Cloning validation** (align Sanger reads to expected) | ❌ | ✅ |

## 5. Primer Design

| Feature | Us | Geneious |
|---|---|---|
| **Design PCR primers** (Primer3 integration) | ❌ | ✅ |
| **Sequencing primer design** | ❌ | ✅ |
| **Primer specificity check** (off-target binding) | ❌ | ✅ |
| **Hairpin/dimer screening** | ❌ | ✅ |
| **5' extensions** (restriction sites, tails) | ❌ | ✅ |
| **Primer database** (store + search) | ❌ | ✅ |
| **Tm, GC% calculations** | ❌ | ✅ |

## 6. BLAST & Alignment

| Feature | Us | Geneious |
|---|---|---|
| **BLAST search** (NCBI or local database) | ❌ | ✅ |
| **Pairwise alignment** | ❌ | ✅ |
| **Multiple sequence alignment** (MUSCLE, ClustalW, MAFFT) | ❌ | ✅ |
| **Alignment viewer** with consensus highlighting | ❌ | ✅ |
| **Dotplot** | ❌ | ✅ |

## 7. Export & Sharing

| Feature | Us | Geneious |
|---|---|---|
| Import GenBank | ✅ | ✅ |
| Export GenBank | ⚠️ basic | ✅ |
| **Export FASTA** | ⚠️ clipboard | ✅ file |
| **Export as PDF/SVG/PNG** (publication quality) | ❌ | ✅ |
| **Export as CSV/Excel** (annotation table) | ❌ | ✅ |
| **Batch export** (multiple sequences) | ❌ | ✅ |
| **Print view** | ❌ | ✅ |

## 8. Data Management

| Feature | Us | Geneious |
|---|---|---|
| Folder organization | ✅ | ✅ |
| Drag & drop import | ✅ | ✅ |
| **Search across all sequences** | ❌ | ✅ |
| **Metadata fields** (organism, description, notes) | ⚠️ display | ✅ edit |
| **Sequence comparison** (side-by-side) | ❌ | ✅ |
| **Version history / undo** | ❌ | ✅ |
| **Shared database** (team collaboration) | ❌ | ✅ |

---

## Priority Recommendations

### Quick Wins (high impact, low effort)
1. **Go-to-base** navigation (text input → jump to position)
2. **Add annotation by selection** (drag region → create feature dialog)
3. **Export as PNG/SVG** (canvas → image download)
4. **GC content graph** (overlay on circular/linear view)

### Medium Effort (differentiation features)
5. **Restriction site finder** + display on map
6. **Edit annotations in-place** (rename, drag endpoints)
7. **Reading frame selector** (toggle 1/2/3/all frames)
8. **Circular overview inset** (mini-map)

### Major Features (long-term roadmap)
9. **Cloning simulation** (restriction cloning, Gibson, Golden Gate)
10. **Primer design** (Primer3 integration)
11. **BLAST integration**
12. **Alignment viewer**
