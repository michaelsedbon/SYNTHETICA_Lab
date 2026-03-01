# Experiment Template

Reference template for creating new experiment folders. Every experiment **must** contain these 4 files.

---

## Required Folder Structure

```
experiments/EXP_XXX/
├── summary.md         # High-level overview, goals, status, results
├── LOG.md             # Chronological log of every action/change
├── SCRIPT_INDEX.md    # Index of all scripts, firmware, and generated files
└── DOC_INDEX.md       # Index of all markdown/documentation files
```

---

## File Templates

### summary.md

```markdown
# EXP_XXX: [Title]

**Start Date:** YYYY-MM-DD
**Status:** In progress
**Airtable Links:** None

---

## Overview

[Brief description of the experiment — what, why, and how.]

## Goal

[What this experiment aims to achieve or demonstrate.]

## Progress

### Phase 1: [Phase Name] 🔲
- [ ] Step 1
- [ ] Step 2

## Results

_No results yet._

## References

- [Relevant papers, links, or prior experiments]
```

### LOG.md

```markdown
# EXP_XXX — Experiment Log

Chronological record of all actions, changes, and observations.

---

## YYYY-MM-DD — Experiment Created

- Initialised experiment folder from template.
- Goal: [one-line goal]
```

### SCRIPT_INDEX.md

```markdown
# EXP_XXX — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

_No scripts yet._
```

### DOC_INDEX.md

```markdown
# EXP_XXX — Documentation Index

Index of all markdown and documentation files in this experiment.

---

| File | Description |
|------|-------------|
| `summary.md` | Experiment overview, goals, and progress |
| `LOG.md` | Chronological experiment log |
| `SCRIPT_INDEX.md` | Script and file index |
| `DOC_INDEX.md` | This file |
```

---

## Conventions

1. **LOG.md is append-only** — never delete entries, only add new dated sections at the bottom.
2. **summary.md reflects current state** — update it after each significant change.
3. **SCRIPT_INDEX.md** — add an entry every time a new script, firmware, or data file is created.
4. **DOC_INDEX.md** — add an entry every time a new `.md` file is created in the experiment.
