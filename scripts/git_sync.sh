#!/bin/bash
# Git auto-sync: watches for remote changes and pulls automatically.
# Also commits and pushes local changes made by the agent.
# Run as a background service on the server.
#
# Usage: nohup ./git_sync.sh &
# Or install as systemd service (see below)

REPO_DIR="/opt/synthetica-lab"
POLL_INTERVAL=30  # seconds between checks
LOG_FILE="/tmp/git-sync.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" >> "$LOG_FILE"
}

log "Git sync started. Watching $REPO_DIR every ${POLL_INTERVAL}s"

while true; do
    cd "$REPO_DIR" || { log "ERROR: Can't cd to $REPO_DIR"; exit 1; }

    # Check for local changes (agent wrote files)
    LOCAL_CHANGES=$(git status --porcelain 2>/dev/null)
    if [ -n "$LOCAL_CHANGES" ]; then
        log "Local changes detected — committing and pushing"
        git add -A
        git commit -m "agent: auto-sync $(date '+%H:%M:%S')" --author="Lab Agent <agent@synthetica.lab>" 2>&1 | tail -1 >> "$LOG_FILE"
        git push origin main 2>&1 | tail -1 >> "$LOG_FILE"
        log "Push complete"
    fi

    # Check for remote changes
    git fetch origin main --quiet 2>/dev/null
    LOCAL_HEAD=$(git rev-parse HEAD 2>/dev/null)
    REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null)

    if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
        log "Remote changes detected — pulling"
        git reset --hard origin/main 2>&1 | tail -1 >> "$LOG_FILE"
        log "Pull complete: $(git log -1 --oneline)"

        # Restart agent to pick up new code/state
        AGENT_PID=$(pgrep -f "uvicorn server.main:app.*8003")
        if [ -n "$AGENT_PID" ]; then
            log "Restarting agent (PID $AGENT_PID)"
            kill "$AGENT_PID" 2>/dev/null
            sleep 2
            cd "$REPO_DIR/applications/lab-agent"
            OLLAMA_HOST=http://localhost:11434 \
            LAB_WORKSPACE=/opt/synthetica-lab \
            MACHINE_IP=172.16.1.115 \
            nohup .venv/bin/python -m uvicorn server.main:app --host 0.0.0.0 --port 8003 >> /tmp/lab-agent.log 2>&1 &
            log "Agent restarted"
        fi
    fi

    sleep "$POLL_INTERVAL"
done
