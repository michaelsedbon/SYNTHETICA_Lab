"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface TemperatureChartProps {
  /** Timestamps as Unix epoch seconds */
  timestamps: number[];
  /** Temperature values in °C */
  temperatures: number[];
  /** Humidity values in % RH */
  humidities: number[];
  /** Chart title */
  title?: string;
  /** Range label (e.g., "24h", "7d") */
  range?: string;
}

const COLORS = {
  temp: "#34d399",        // emerald-400
  tempFill: "rgba(52, 211, 153, 0.08)",
  humidity: "#60a5fa",    // blue-400
  humidityFill: "rgba(96, 165, 250, 0.08)",
  grid: "rgba(255, 255, 255, 0.04)",
  gridText: "rgba(255, 255, 255, 0.3)",
  axis: "rgba(255, 255, 255, 0.1)",
  crosshair: "rgba(255, 255, 255, 0.15)",
  tooltipBg: "rgba(24, 24, 27, 0.95)",
  tooltipBorder: "rgba(255, 255, 255, 0.1)",
};

export function TemperatureChart({
  timestamps,
  temperatures,
  humidities,
  title,
  range = "24h",
}: TemperatureChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Padding
  const PAD = { top: 30, right: 60, bottom: 40, left: 50 };

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = dimensions.width;
    const H = dimensions.height;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    // Clear
    ctx.clearRect(0, 0, W, H);

    if (timestamps.length < 2) {
      // No data message
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for sensor data...", W / 2, H / 2);
      return;
    }

    // Compute bounds
    const tMin = timestamps[0];
    const tMax = timestamps[timestamps.length - 1];

    let tempMin = Infinity, tempMax = -Infinity;
    let humMin = Infinity, humMax = -Infinity;
    for (const v of temperatures) {
      if (v < tempMin) tempMin = v;
      if (v > tempMax) tempMax = v;
    }
    for (const v of humidities) {
      if (v < humMin) humMin = v;
      if (v > humMax) humMax = v;
    }

    // Add 10% padding to Y ranges
    const tempRange = tempMax - tempMin || 1;
    tempMin -= tempRange * 0.1;
    tempMax += tempRange * 0.1;
    const humRange = humMax - humMin || 1;
    humMin -= humRange * 0.1;
    humMax += humRange * 0.1;

    // Map functions
    const mapX = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin)) * plotW;
    const mapTempY = (v: number) => PAD.top + plotH - ((v - tempMin) / (tempMax - tempMin)) * plotH;
    const mapHumY = (v: number) => PAD.top + plotH - ((v - humMin) / (humMax - humMin)) * plotH;

    // ── Grid lines ──
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    // Horizontal grid (temperature axis)
    const tempStep = niceStep(tempMin, tempMax, 5);
    for (let v = Math.ceil(tempMin / tempStep) * tempStep; v <= tempMax; v += tempStep) {
      const y = mapTempY(v);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = COLORS.temp;
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${v.toFixed(1)}°`, PAD.left - 6, y + 3);
    }

    // Humidity axis labels (right side)
    const humStep = niceStep(humMin, humMax, 5);
    for (let v = Math.ceil(humMin / humStep) * humStep; v <= humMax; v += humStep) {
      const y = mapHumY(v);
      ctx.fillStyle = COLORS.humidity;
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${v.toFixed(0)}%`, W - PAD.right + 6, y + 3);
    }

    // Time axis labels
    const timeStep = niceTimeStep(tMax - tMin);
    ctx.fillStyle = COLORS.gridText;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    for (let t = Math.ceil(tMin / timeStep) * timeStep; t <= tMax; t += timeStep) {
      const x = mapX(t);
      const d = new Date(t * 1000);
      const label = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      ctx.fillText(label, x, H - PAD.bottom + 16);

      // Vertical grid
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, H - PAD.bottom);
      ctx.stroke();
    }

    // ── Draw temperature line + fill ──
    drawLine(ctx, timestamps, temperatures, mapX, mapTempY, COLORS.temp, COLORS.tempFill, plotH, PAD);

    // ── Draw humidity line + fill ──
    drawLine(ctx, timestamps, humidities, mapX, mapHumY, COLORS.humidity, COLORS.humidityFill, plotH, PAD);

    // ── Title ──
    if (title) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(title, PAD.left, 16);
    }

    // ── Legend ──
    const legendX = W - PAD.right - 120;
    ctx.font = "10px system-ui, sans-serif";

    ctx.fillStyle = COLORS.temp;
    ctx.fillRect(legendX, 10, 10, 3);
    ctx.fillText("Temperature", legendX + 14, 14);

    ctx.fillStyle = COLORS.humidity;
    ctx.fillRect(legendX + 80, 10, 10, 3);
    ctx.fillText("Humidity", legendX + 94, 14);

    // ── Crosshair + tooltip ──
    if (mousePos && mousePos.x > PAD.left && mousePos.x < W - PAD.right) {
      const t = tMin + ((mousePos.x - PAD.left) / plotW) * (tMax - tMin);
      // Find nearest index
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < timestamps.length; i++) {
        const dist = Math.abs(timestamps[i] - t);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }

      const x = mapX(timestamps[nearest]);

      // Vertical crosshair
      ctx.strokeStyle = COLORS.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, H - PAD.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Data dots
      const tempY = mapTempY(temperatures[nearest]);
      const humY = mapHumY(humidities[nearest]);

      ctx.fillStyle = COLORS.temp;
      ctx.beginPath();
      ctx.arc(x, tempY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.humidity;
      ctx.beginPath();
      ctx.arc(x, humY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip
      const time = new Date(timestamps[nearest] * 1000);
      const timeStr = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const tooltipLines = [
        timeStr,
        `${temperatures[nearest].toFixed(1)}°C`,
        `${humidities[nearest].toFixed(1)}%`,
      ];

      const tooltipW = 90;
      const tooltipH = 52;
      let tooltipX = x + 12;
      if (tooltipX + tooltipW > W - PAD.right) tooltipX = x - tooltipW - 12;

      ctx.fillStyle = COLORS.tooltipBg;
      ctx.strokeStyle = COLORS.tooltipBorder;
      ctx.lineWidth = 1;
      roundRect(ctx, tooltipX, PAD.top + 4, tooltipW, tooltipH, 6);

      ctx.fillStyle = COLORS.gridText;
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(tooltipLines[0], tooltipX + 8, PAD.top + 18);
      ctx.fillStyle = COLORS.temp;
      ctx.fillText(tooltipLines[1], tooltipX + 8, PAD.top + 32);
      ctx.fillStyle = COLORS.humidity;
      ctx.fillText(tooltipLines[2], tooltipX + 8, PAD.top + 46);
    }
  }, [timestamps, temperatures, humidities, dimensions, mousePos, title]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px] relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setMousePos(null)}
      />
    </div>
  );
}

// ── Helpers ──

function drawLine(
  ctx: CanvasRenderingContext2D,
  xs: number[],
  ys: number[],
  mapX: (t: number) => number,
  mapY: (v: number) => number,
  color: string,
  fillColor: string,
  plotH: number,
  pad: { top: number; bottom: number }
) {
  if (xs.length < 2) return;

  // Fill area
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(mapX(xs[0]), pad.top + plotH);
  for (let i = 0; i < xs.length; i++) {
    ctx.lineTo(mapX(xs[i]), mapY(ys[i]));
  }
  ctx.lineTo(mapX(xs[xs.length - 1]), pad.top + plotH);
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(mapX(xs[0]), mapY(ys[0]));
  for (let i = 1; i < xs.length; i++) {
    ctx.lineTo(mapX(xs[i]), mapY(ys[i]));
  }
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function niceStep(min: number, max: number, targetSteps: number): number {
  const range = max - min;
  const rough = range / targetSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / magnitude;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function niceTimeStep(rangeSeconds: number): number {
  if (rangeSeconds <= 3600) return 300;           // 5 min
  if (rangeSeconds <= 14400) return 1800;          // 30 min
  if (rangeSeconds <= 86400) return 3600;          // 1 hour
  if (rangeSeconds <= 7 * 86400) return 6 * 3600;  // 6 hours
  return 24 * 3600;                                 // 1 day
}
