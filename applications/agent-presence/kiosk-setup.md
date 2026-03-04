# Kiosk Setup — Agent Presence Dashboard

Step-by-step guide to configure the Linux server as a dedicated kiosk display.

> **Status**: Already applied to `172.16.1.80` on March 4, 2026.

---

## Prerequisites

- Ubuntu 24.04 with GNOME desktop
- GDM3 display manager
- User account `michael`
- SSH access from Mac

---

## 1. Auto-Login

Edit `/etc/gdm3/custom.conf`:

```ini
[daemon]
AutomaticLoginEnable=true
AutomaticLogin=michael
```

---

## 2. Disable Lock Screen

```bash
# Run with GNOME session active
export DISPLAY=:0
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.lockdown disable-lock-screen true
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
gsettings set org.gnome.settings-daemon.plugins.power idle-dim false
```

---

## 3. Install Chromium & xdotool

```bash
sudo snap install chromium
sudo apt install -y xdotool
```

---

## 4. Dashboard systemd Service

Create `/etc/systemd/system/agent-presence.service`:

```ini
[Unit]
Description=Agent Presence Dashboard
After=network.target

[Service]
Type=simple
User=michael
WorkingDirectory=/opt/synthetica-lab/applications/agent-presence
ExecStart=/usr/bin/python3 serve.py
Restart=always
RestartSec=5
Environment=DISPLAY=:0
Environment=PRESENCE_PORT=3005

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable agent-presence
sudo systemctl start agent-presence
```

---

## 5. Chromium Kiosk Autostart

Create `~/.config/autostart/agent-presence.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Agent Presence Dashboard
Exec=bash -c "sleep 5 && chromium-browser --kiosk --start-fullscreen --noerrdialogs --disable-infobars --disable-translate --no-first-run --disable-features=TranslateUI --disable-session-crashed-bubble http://localhost:3005 & sleep 8 && DISPLAY=:0 xdotool search --name Agent windowactivate key F11"
X-GNOME-Autostart-enabled=true
```

---

## 6. Lock Screen Disable Autostart

Create `~/.config/autostart/disable-lock.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Disable Lock Screen
Exec=bash -c "gsettings set org.gnome.desktop.screensaver lock-enabled false && gsettings set org.gnome.desktop.lockdown disable-lock-screen true && xset dpms 0 0 0 && xset s off"
X-GNOME-Autostart-enabled=true
```

---

## Verify

```bash
# Check service
systemctl is-active agent-presence

# Check HTTP
curl -s -o /dev/null -w '%{http_code}' http://localhost:3005/

# Check auto-login
grep AutomaticLogin /etc/gdm3/custom.conf

# Check lock screen
gsettings get org.gnome.desktop.screensaver lock-enabled
# Should be: false

# Check autostart files
ls ~/.config/autostart/
```

---

## Maintenance

### Refresh after code update

```bash
cd /opt/synthetica-lab && git pull
DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority xdotool key ctrl+shift+r
```

### Start GNOME without reboot

```bash
sudo systemctl start gdm3
```

### Force Chromium fullscreen

```bash
DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority xdotool search --name Agent windowactivate key F11
```
