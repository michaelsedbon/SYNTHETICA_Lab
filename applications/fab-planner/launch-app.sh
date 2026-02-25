#!/bin/bash
# Launch Fab Planner as a standalone app window
# Uses Chrome's --app flag for a clean, tab-free experience

APP_URL="http://localhost:3000"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start the dev server in the background if not already running
if ! lsof -ti :3000 > /dev/null 2>&1; then
  cd "$PROJECT_DIR"
  npm run dev &
  # Wait for server to be ready
  echo "Starting server..."
  for i in $(seq 1 30); do
    curl -s "$APP_URL" > /dev/null 2>&1 && break
    sleep 1
  done
fi

# Open in Chrome app mode (standalone window, shows in Cmd+Tab)
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$APP_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$APP_URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "Brave Browser" --args --app="$APP_URL"
else
  # Fallback: open in default browser
  open "$APP_URL"
fi
