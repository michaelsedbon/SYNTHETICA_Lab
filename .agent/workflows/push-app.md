---
description: Commit and push changes to an application submodule, then update the main repo pointer
---

# Push App Changes

When you've made changes to an application in `applications/<app-name>/`, follow these steps to commit both the submodule and main repo.

## Steps

// turbo-all

1. Identify which app was modified. Check with:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB && git diff --name-only
```

2. Stage, commit, and push **inside the submodule**:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/<APP_NAME>
git add -A
git commit -m "<describe changes>"
git push origin main
```

3. Update the **main repo pointer** to the new submodule commit:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB
git add applications/<APP_NAME>
git commit -m "Update <APP_NAME> submodule"
git push
```

## Important Notes

- Always push the submodule **first**, then update the main repo pointer
- If you forget step 3, the main repo will still point to the old commit
- If multiple apps changed, repeat steps 2–3 for each app
- To push ALL changed submodules at once, use the `/push-all-apps` workflow
