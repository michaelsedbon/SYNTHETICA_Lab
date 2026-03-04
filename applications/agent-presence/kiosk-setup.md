# Kiosk Setup Guide — Linux Server

One-time setup to make the server's monitor display the Agent Presence Dashboard automatically.

---

## 1. Disable Lock Screen

```bash
# For GNOME (Ubuntu 24.04 with GDM3):
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false
gsettings set org.gnome.desktop.session idle-delay 0
```

---

## 2. Enable Auto-Login

Edit `/etc/gdm3/custom.conf`:

```bash
sudo nano /etc/gdm3/custom.conf
```

Add/uncomment under `[daemon]`:

```ini
[daemon]
AutomaticLoginEnable=true
AutomaticLogin=michael
```

---

## 3. Install Chromium (if not present)

```bash
sudo apt install chromium-browser -y
```

---

## 4. Create Kiosk Autostart Entry

```bash
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/agent-presence.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Agent Presence Dashboard
Exec=bash -c "sleep 5 && chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-translate --no-first-run --fast --fast-start --disable-features=TranslateUI --disable-session-crashed-bubble http://localhost:3005"
X-GNOME-Autostart-enabled=true
EOF
```

---

## 5. Configure DPMS (Display Power Management)

```bash
# Auto screen-off after 5 minutes of no xset reset (overridden by dashboard)
xset dpms 300 300 300
xset s off   # disable built-in screensaver
```

Add to `~/.profile` for persistence:

```bash
echo 'xset dpms 300 300 300 && xset s off' >> ~/.profile
```

---

## 6. Start the Dashboard Server

Add to systemd or crontab:

```bash
# Option A: systemd service
sudo tee /etc/systemd/system/agent-presence.service << 'EOF'
[Unit]
Description=Agent Presence Dashboard
After=network.target

[Service]
Type=simple
User=michael
WorkingDirectory=/opt/synthetica-lab/applications/agent-presence
ExecStart=/usr/bin/python3 serve.py
Restart=always
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable agent-presence
sudo systemctl start agent-presence
```

```bash
# Option B: crontab
crontab -e
# Add: @reboot cd /opt/synthetica-lab/applications/agent-presence && python3 serve.py
```

---

## 7. Reboot & Verify

```bash
sudo reboot
```

After reboot:
1. Server should auto-login to GNOME
2. Chromium opens in kiosk mode at `http://localhost:3005`
3. Dashboard connects to lab-agent WebSocket at `:8003`
4. Screen turns off after 5 minutes of inactivity
5. Screen turns on when agent starts processing
