# Experiment Viewer — Online Access via Cloudflare Tunnel

Expose the experiment viewer publicly so you can share lab notebook pages with collaborators.

## Architecture

```
Internet → Cloudflare Tunnel → localhost:3002 (Next.js)
                                     ↓ /api/* rewrite
                               localhost:8001 (FastAPI backend)
```

Only port 3002 is tunnelled. The backend is proxied through Next.js via `rewrites` in `next.config.ts`.

---

## Setup (one-time, on the server)

### 1. Install cloudflared

```bash
# Debian/Ubuntu
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
```

### 2. Authenticate

```bash
cloudflared tunnel login
```

This opens a browser — pick the Cloudflare domain you want to use.

### 3. Create a named tunnel

```bash
cloudflared tunnel create lab-viewer
```

Note the **tunnel ID** (UUID) printed.

### 4. Configure the tunnel

Create `~/.cloudflared/config.yml`:

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

### 6. Run as a systemd service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 7. Verify

Open `https://lab.yourdomain.com` from any network. The experiment viewer should load with all content.

---

## Quick testing (no domain needed)

For a quick test without a domain:

```bash
cloudflared tunnel --url http://localhost:3002
```

This prints a temporary `https://xxxx.trycloudflare.com` URL. Works for testing but the URL changes each time.

---

## Sharing Links

The experiment viewer supports direct links to specific pages:

```
https://lab.yourdomain.com/?source=Lab&path=EXP_003/summary.md
```

Click the **Share** button in the toolbar to copy the link for the current page.
