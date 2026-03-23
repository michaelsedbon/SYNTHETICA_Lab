---
description: Deploy fab-planner code changes to the production server safely — NEVER touches the database or uploads
---

# Deploy Fab Planner

// turbo-all

> **CRITICAL**: This workflow ONLY syncs application code. It NEVER touches `dev.db`, `dev.db-wal`, `dev.db-shm`, `uploads/`, or `backups/`. Violating this will destroy production data.

## Steps

1. Verify the build passes locally first:
```bash
cd /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/fab-planner
npx next build 2>&1 | tail -5
```

2. Rsync ONLY application source code to the server (explicit excludes for ALL data files):
```bash
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'dev.db' \
  --exclude 'dev.db-wal' \
  --exclude 'dev.db-shm' \
  --exclude 'dev.db-journal' \
  --exclude '*.db' \
  --exclude '*.db-*' \
  --exclude 'prisma/dev.db' \
  --exclude 'prisma/*.db*' \
  --exclude 'uploads/' \
  --exclude 'backups/' \
  --exclude 'logs/' \
  --exclude '.env' \
  /Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/fab-planner/ \
  michael@172.16.1.80:/opt/fab-planner/
```

3. Rebuild and restart the app on the server:
```bash
ssh michael@172.16.1.80 "export PATH=/home/michael/.nvm/versions/node/v20.20.0/bin:\$PATH && cd /opt/fab-planner && npm install 2>&1 | tail -3 && npm run build 2>&1 | tail -5 && sudo systemctl restart fab-planner && echo '=== Deploy complete ==='"
```

4. Verify the app is responding:
```bash
ssh michael@172.16.1.80 "curl -s http://localhost:3000/api/workspaces | head -100"
```
