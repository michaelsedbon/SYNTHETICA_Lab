"use client";

import { useRef, useEffect, useCallback } from "react";

interface LiveChartProps {
    times: number[];
    rawUv: number[];
    filteredUv: number[];
    peaks: Array<{
        time: number;
        height_uv: number;
        polarity: string;
    }>;
    /** How many seconds of data to show on the x-axis */
    windowSeconds?: number;
}

/**
 * Real-time voltage trace rendered on HTML Canvas.
 * No interpolation — uses discrete dots connected by step lines.
 * Scientific data rendering.
 */
export function LiveChart({
    times,
    rawUv,
    filteredUv,
    peaks,
    windowSeconds = 30,
}: LiveChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        // Margins
        const ml = 70, mr = 20, mt = 20, mb = 40;
        const plotW = W - ml - mr;
        const plotH = H - mt - mb;

        // Clear
        ctx.fillStyle = "#09090b"; // zinc-950
        ctx.fillRect(0, 0, W, H);

        if (times.length === 0) {
            ctx.fillStyle = "#71717a";
            ctx.font = "14px var(--font-geist-mono, monospace)";
            ctx.textAlign = "center";
            ctx.fillText("Waiting for data…", W / 2, H / 2);
            return;
        }

        // Determine axis ranges
        const tMax = times[times.length - 1];
        const tMin = Math.max(0, tMax - windowSeconds);

        // Filter data to the visible window
        const visibleIndices: number[] = [];
        for (let i = 0; i < times.length; i++) {
            if (times[i] >= tMin && times[i] <= tMax) {
                visibleIndices.push(i);
            }
        }

        if (visibleIndices.length === 0) {
            ctx.fillStyle = "#71717a";
            ctx.font = "14px var(--font-geist-mono, monospace)";
            ctx.textAlign = "center";
            ctx.fillText("No visible data", W / 2, H / 2);
            return;
        }

        // Calculate voltage range from visible data
        let vMin = Infinity, vMax = -Infinity;
        for (const i of visibleIndices) {
            const raw = rawUv[i] ?? 0;
            const filt = filteredUv[i] ?? 0;
            const v = Math.max(Math.abs(raw), Math.abs(filt));
            if (-v < vMin) vMin = -v;
            if (v > vMax) vMax = v;
        }
        // Add 20% padding
        const vRange = vMax - vMin || 100;
        vMin -= vRange * 0.1;
        vMax += vRange * 0.1;

        // Scale functions
        const scaleX = (t: number) => ml + ((t - tMin) / (tMax - tMin || 1)) * plotW;
        const scaleY = (v: number) => mt + plotH - ((v - vMin) / (vMax - vMin)) * plotH;

        // --- Grid lines ---
        ctx.strokeStyle = "#27272a"; // zinc-800
        ctx.lineWidth = 1;

        // Horizontal grid lines
        const nGridH = 6;
        ctx.font = "11px var(--font-geist-mono, monospace)";
        ctx.fillStyle = "#71717a"; // zinc-500
        ctx.textAlign = "right";
        for (let i = 0; i <= nGridH; i++) {
            const v = vMin + (i / nGridH) * (vMax - vMin);
            const y = scaleY(v);
            ctx.beginPath();
            ctx.moveTo(ml, y);
            ctx.lineTo(ml + plotW, y);
            ctx.stroke();
            ctx.fillText(`${v.toFixed(0)} µV`, ml - 8, y + 4);
        }

        // Vertical time grid lines
        const nGridV = 6;
        ctx.textAlign = "center";
        for (let i = 0; i <= nGridV; i++) {
            const t = tMin + (i / nGridV) * (tMax - tMin);
            const x = scaleX(t);
            ctx.beginPath();
            ctx.moveTo(x, mt);
            ctx.lineTo(x, mt + plotH);
            ctx.stroke();
            ctx.fillText(`${t.toFixed(1)}s`, x, mt + plotH + 20);
        }

        // Zero line
        if (vMin < 0 && vMax > 0) {
            ctx.strokeStyle = "#3f3f46"; // zinc-700
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            const y0 = scaleY(0);
            ctx.beginPath();
            ctx.moveTo(ml, y0);
            ctx.lineTo(ml + plotW, y0);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // --- Plot raw signal (dim) ---
        ctx.strokeStyle = "rgba(34, 197, 94, 0.3)"; // green-500 dim
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (const i of visibleIndices) {
            const x = scaleX(times[i]);
            const y = scaleY(rawUv[i] ?? 0);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                // Step rendering — no interpolation
                const prevIdx = visibleIndices[visibleIndices.indexOf(i) - 1];
                if (prevIdx !== undefined) {
                    const prevX = scaleX(times[prevIdx]);
                    const prevY = scaleY(rawUv[prevIdx] ?? 0);
                    ctx.lineTo(x, prevY); // horizontal step
                    ctx.lineTo(x, y);     // vertical drop
                }
            }
        }
        ctx.stroke();

        // --- Plot filtered signal (bright) ---
        ctx.strokeStyle = "#22c55e"; // green-500
        ctx.lineWidth = 2;
        ctx.beginPath();
        started = false;
        for (const i of visibleIndices) {
            const x = scaleX(times[i]);
            const y = scaleY(filteredUv[i] ?? 0);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                const prevIdx = visibleIndices[visibleIndices.indexOf(i) - 1];
                if (prevIdx !== undefined) {
                    const prevX = scaleX(times[prevIdx]);
                    const prevY = scaleY(filteredUv[prevIdx] ?? 0);
                    ctx.lineTo(x, prevY);
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();

        // --- Data points (dots) ---
        ctx.fillStyle = "#22c55e";
        for (const i of visibleIndices) {
            const x = scaleX(times[i]);
            const y = scaleY(filteredUv[i] ?? 0);
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- Peak markers ---
        for (const peak of peaks) {
            if (peak.time < tMin || peak.time > tMax) continue;
            const x = scaleX(peak.time);
            const y = scaleY(peak.height_uv);

            // Triangle marker
            const isPositive = peak.polarity === "positive";
            ctx.fillStyle = isPositive ? "#f59e0b" : "#ef4444"; // amber or red
            ctx.beginPath();
            if (isPositive) {
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x - 5, y);
                ctx.lineTo(x + 5, y);
            } else {
                ctx.moveTo(x, y + 10);
                ctx.lineTo(x - 5, y);
                ctx.lineTo(x + 5, y);
            }
            ctx.closePath();
            ctx.fill();

            // Peak label
            ctx.fillStyle = isPositive ? "#f59e0b" : "#ef4444";
            ctx.font = "10px var(--font-geist-mono, monospace)";
            ctx.textAlign = "center";
            ctx.fillText(
                `${peak.height_uv.toFixed(0)}µV`,
                x,
                isPositive ? y - 14 : y + 20
            );
        }

        // --- Plot border ---
        ctx.strokeStyle = "#3f3f46";
        ctx.lineWidth = 1;
        ctx.strokeRect(ml, mt, plotW, plotH);

        // --- Axis labels ---
        ctx.fillStyle = "#a1a1aa"; // zinc-400
        ctx.font = "12px var(--font-geist-sans, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Time (s)", ml + plotW / 2, H - 4);

        ctx.save();
        ctx.translate(16, mt + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("Voltage (µV)", 0, 0);
        ctx.restore();

    }, [times, rawUv, filteredUv, peaks, windowSeconds]);

    useEffect(() => {
        draw();
        const handleResize = () => draw();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [draw]);

    return (
        <div ref={containerRef} className="w-full h-full min-h-[300px]">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
}
