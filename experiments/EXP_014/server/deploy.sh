#!/bin/bash
# Deploy machine controller code to LattePanda and restart service.
# Usage: ./deploy.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "▸ Syncing files to LattePanda..."
rsync -avz --exclude '__pycache__' --exclude '.git' \
  "$SCRIPT_DIR/" lp:~/machine-controller-app/

echo "▸ Restarting service..."
ssh lp "sudo systemctl restart machine-controller"

sleep 3

echo "▸ Checking status..."
ssh lp "sudo systemctl status machine-controller --no-pager -l | head -15"

echo ""
echo "▸ API health check..."
curl -sf http://172.16.1.128:8000/api/system/health 2>/dev/null && echo " ✅" || echo " ❌ API not responding"
