---
description: Pull latest changes for all application submodules from their remote repos
---

# Pull App Updates

Fetch and update all application submodules to their latest remote commits.

## Steps

// turbo-all

1. Pull all submodule updates:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB
git submodule update --remote --merge
```

2. Check status:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB
git submodule status
```

3. If the main repo shows changed submodule pointers, commit them:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB
git add applications/
git diff --cached --quiet || git commit -m "Update app submodule pointers to latest"
git push
```
