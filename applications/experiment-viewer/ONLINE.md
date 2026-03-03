# Experiment Viewer — Online Access

Expose the experiment viewer publicly so you can share lab notebook pages with collaborators.

## Architecture

```
Internet → Cloudflare Tunnel → localhost:3002 (Next.js)
                                     ↓ /api/* rewrite
                               localhost:8001 (FastAPI backend)
```

Only port 3002 is tunnelled. The backend is proxied through Next.js via `rewrites` in `next.config.ts`.

---

## What's on the Server

| What | Server path | Synced via |
|------|-------------|------------|
| Lab experiments (`.md` files) | `/opt/synthetica-lab/experiments` | `git pull` (deploy workflow) |
| Lab images (`.png`, `.jpg`, etc.) | same as above | `rsync` (images are gitignored) |
| PhD experiments + images | `/opt/PhD/experiments` | `git pull` + `rsync` |
| Applications | `/opt/synthetica-lab/applications` | `git pull` |

> **Important**: `*.png` is in `.gitignore`. New plots/images must be synced via rsync (see below).

---

## Quick Tunnel (temporary URL, no domain needed)

Start a free temporary tunnel that gives a random `trycloudflare.com` URL:

```bash
# On the server
ssh michael@172.16.1.80

# Start tunnel (runs in background)
nohup cloudflared tunnel --url http://localhost:3002 > /tmp/cloudflared-test.log 2>&1 &

# Get the URL
sleep 5 && grep 'trycloudflare' /tmp/cloudflared-test.log
```

⚠️ **The URL changes every time** the tunnel restarts (reboot, crash, manual restart).

### Restart the tunnel

```bash
ssh michael@172.16.1.80 "pkill cloudflared 2>/dev/null; sleep 1; nohup cloudflared tunnel --url http://localhost:3002 > /tmp/cloudflared-test.log 2>&1 & sleep 5 && grep 'trycloudflare' /tmp/cloudflared-test.log"
```

---

## Permanent Tunnel (requires a domain, ~$10/year)

For a stable URL like `lab.yourdomain.com`:

### 1. Install cloudflared (already done)
```bash
cloudflared --version  # 2026.2.0
```

### 2. Authenticate
```bash
cloudflared tunnel login
```

### 3. Create a named tunnel
```bash
cloudflared tunnel create lab-viewer
# Note the tunnel ID (UUID)
```

### 4. Configure `~/.cloudflared/config.yml`
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/michael/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: lab.yourdomain.com
    service: http://localhost:3002
  - service: http_status:404
```

### 5. Create DNS record
```bash
cloudflared tunnel route dns lab-viewer lab.yourdomain.com
```

### 6. Run as systemd service
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Syncing Images to the Server

Since `*.png` is gitignored, images must be synced separately via rsync.

### Sync Lab images
```bash
rsync -avz --include='*/' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' --include='*.svg' --include='*.webp' --exclude='*' \
  ~/Documents/SYNTHETIC_PERSONAL_LAB/experiments/ michael@172.16.1.80:/opt/synthetica-lab/experiments/
```

### Sync PhD images
```bash
rsync -avz --include='*/' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' --include='*.svg' --include='*.webp' --exclude='*' \
  ~/Documents/PhD/experiments/ michael@172.16.1.80:/opt/PhD/experiments/
```

---

## Features for Online Use

- **Share button** — Click "Share" in the toolbar → copies a direct link to that experiment page
- **Deep-linking** — URLs like `?source=Lab&path=EXP_003/summary.md` open a specific page directly
- **Mobile-responsive** — Sidebar auto-closes on screens < 768px wide
- **All sources** — Lab, PhD, and Applications are all available online

---

## Server Settings

The experiment viewer sources are configured in:
```
/opt/synthetica-lab/applications/experiment-viewer/server/settings.json
```

Current configuration:
```json
{
  "sources": [
    { "label": "Lab", "path": "/opt/synthetica-lab/experiments" },
    { "label": "PhD", "path": "/opt/PhD/experiments" },
    { "label": "Applications", "path": "/opt/synthetica-lab/applications" }
  ]
}
```

After editing, restart the backend:
```bash
ssh michael@172.16.1.80 "kill \$(lsof -ti :8001) 2>/dev/null; sleep 1; cd /opt/synthetica-lab/applications/experiment-viewer/server && nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 > /tmp/exp-viewer.log 2>&1 &"
```
