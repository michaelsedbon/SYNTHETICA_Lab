# Fab Planner — Deployment Guide

> Deploy from MacBook (dev) → Linux server (production, office LAN)

## Architecture

```
┌─────────────────────┐          ┌─────────────────────────────┐
│   MacBook (dev)     │          │   Linux Server (office LAN) │
│                     │   SSH    │                             │
│  Code editor        │ ──────→ │  Fab Planner (production)   │
│  npm run dev        │   Git   │  npm run start              │
│  Local SQLite DB    │ ──────→ │  Production SQLite DB       │
│                     │          │  Accessible at 192.168.x.x  │
└─────────────────────┘          └─────────────────────────────┘
```

---

## 1. Linux Server Setup

### Install essentials

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Git + build tools (needed for better-sqlite3)
sudo apt install -y git build-essential python3
```

### Set a static LAN IP

Give the server a fixed IP (e.g. `192.168.1.100`) via your router or Ubuntu's netplan config, so the office can always reach it.

---

## 2. Git Setup (the bridge between dev & prod)

### On MacBook (one-time)

```bash
cd ~/Desktop/Planing_fabrication
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:youruser/fab-planner.git
git push -u origin main
```

### On the Linux server (one-time)

```bash
git clone git@github.com:youruser/fab-planner.git /opt/fab-planner
cd /opt/fab-planner
cp .env.example .env
nano .env  # set production values
npm install
npx prisma migrate deploy
npm run build
```

---

## 3. Run in Production (systemd)

### Create the service

```bash
sudo nano /etc/systemd/system/fab-planner.service
```

```ini
[Unit]
Description=Fab Planner
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/opt/fab-planner
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable fab-planner
sudo systemctl start fab-planner
```

The app is now at **http://192.168.1.100:3000** and auto-starts on boot.

---

## 4. Day-to-Day Workflow

### Develop (on MacBook)

```bash
npm run dev          # work locally
git add . && git commit -m "description"
git push
```

### Deploy (one command from MacBook)

```bash
ssh youruser@192.168.1.100 "bash /opt/fab-planner/deploy.sh"
```

### deploy.sh (on the server at `/opt/fab-planner/deploy.sh`)

```bash
#!/bin/bash
cd /opt/fab-planner
git pull origin main
npm install
npx prisma migrate deploy
npm run build
sudo systemctl restart fab-planner
echo "✅ Deployed successfully!"
```

---

## 5. Backups

Daily SQLite backup via cron:

```bash
# crontab -e
0 2 * * * cp /opt/fab-planner/prisma/dev.db /opt/fab-planner/backups/fab-$(date +\%Y\%m\%d).db
```

---

## 6. Optional: Nginx Reverse Proxy

For a nicer URL like `http://fab-planner.local` instead of `:3000`:

```bash
sudo apt install nginx
# Configure proxy_pass to localhost:3000
```
