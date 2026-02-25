#!/usr/bin/env node
/**
 * Lightweight maintenance page server.
 * Runs on port 3000 while the main app rebuilds during deploys.
 * Zero dependencies – uses only Node built-ins.
 */

const http = require('http');

const PORT = 3000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="5">
  <title>Fab Planner — Updating…</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: hsl(240 10% 3.9%);
      color: hsl(0 0% 98%);
      -webkit-font-smoothing: antialiased;
    }

    /* ── Card (shadcn style) ──────────────────────── */
    .card {
      width: 420px;
      max-width: 90vw;
      background: hsl(240 10% 3.9%);
      border: 1px solid hsl(240 3.7% 15.9%);
      border-radius: 12px;
      padding: 48px 40px;
      text-align: center;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.03),
        0 1px 2px rgba(0,0,0,0.4),
        0 8px 32px rgba(0,0,0,0.5);
    }

    /* ── Spinner ──────────────────────────────────── */
    .spinner-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 32px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid hsl(240 3.7% 15.9%);
      border-top-color: hsl(217.2 91.2% 59.8%);
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Typography ───────────────────────────────── */
    h1 {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.025em;
      line-height: 1.3;
      margin-bottom: 12px;
      color: hsl(0 0% 98%);
    }

    .description {
      font-size: 14px;
      line-height: 1.6;
      color: hsl(240 5% 64.9%);
      margin-bottom: 32px;
    }

    /* ── Progress bar (animated) ──────────────────── */
    .progress-track {
      width: 100%;
      height: 6px;
      background: hsl(240 3.7% 15.9%);
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .progress-bar {
      height: 100%;
      width: 40%;
      background: hsl(217.2 91.2% 59.8%);
      border-radius: 9999px;
      animation: progress-slide 1.8s ease-in-out infinite;
    }

    @keyframes progress-slide {
      0%   { transform: translateX(-100%); width: 40%; }
      50%  { transform: translateX(80%);   width: 60%; }
      100% { transform: translateX(250%);  width: 40%; }
    }

    /* ── Footer / badge ──────────────────────────── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 500;
      color: hsl(240 5% 64.9%);
      background: hsl(240 3.7% 15.9%);
      border: 1px solid hsl(240 3.7% 15.9%);
      border-radius: 9999px;
    }

    .badge .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: hsl(217.2 91.2% 59.8%);
      animation: pulse-dot 2s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(0.85); }
    }

    /* ── Subtle background grid ──────────────────── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 64px 64px;
      pointer-events: none;
      z-index: -1;
    }

    /* ── Radial glow ─────────────────────────────── */
    body::after {
      content: '';
      position: fixed;
      top: 30%;
      left: 50%;
      width: 600px;
      height: 600px;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, hsla(217.2, 91.2%, 59.8%, 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: -1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner-wrapper">
      <div class="spinner"></div>
    </div>
    <h1>Update in Progress</h1>
    <p class="description">
      Fab Planner is being updated to the latest version.<br>
      This page will reload automatically.
    </p>
    <div class="progress-track">
      <div class="progress-bar"></div>
    </div>
    <div class="badge">
      <span class="dot"></span>
      Deploying new version…
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(503, {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '5',
        'Cache-Control': 'no-store',
    });
    res.end(html);
});

server.listen(PORT, function () {
    console.log('🔧 Maintenance page serving on http://localhost:' + PORT);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
