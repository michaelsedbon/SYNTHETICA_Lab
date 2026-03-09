---
description: Push all modified application submodules and update the main repo pointers
---

# Push All Modified Apps

Detects which app submodules have uncommitted or unpushed changes, commits and pushes each one, then updates the main repo.

## Steps

// turbo-all

1. Check which submodules have changes:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB && git submodule foreach 'git status --porcelain' 2>&1
```

2. For each submodule with changes, commit and push:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB && git submodule foreach '
  if [ -n "$(git status --porcelain)" ]; then
    echo "=== Pushing $(basename $PWD) ==="
    git add -A
    git commit -m "Update $(basename $PWD)"
    git push origin main
  fi
'
```

3. Update all submodule pointers in the main repo:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB
git add applications/
git diff --cached --quiet || git commit -m "Update app submodule pointers"
git push
```
