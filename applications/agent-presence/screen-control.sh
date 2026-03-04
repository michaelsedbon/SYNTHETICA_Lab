#!/bin/bash
# Screen control helper for the Agent Presence Dashboard.
# Usage: screen-control.sh on|off
# Requires DISPLAY=:0 to be set (or defaults to :0).

DISPLAY="${DISPLAY:-:0}"
export DISPLAY

case "$1" in
  on)
    xset dpms force on 2>/dev/null
    xset s reset 2>/dev/null
    echo "Screen ON"
    ;;
  off)
    xset dpms force off 2>/dev/null
    echo "Screen OFF"
    ;;
  *)
    echo "Usage: $0 {on|off}"
    exit 1
    ;;
esac
