"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Feature } from "@/lib/api";

interface Props {
    sequence: string;
    features: Feature[];
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
}

const BACKBONE_Y = 0.5; // fraction of height
const TRACK_HEIGHT = 18;
const TRACK_GAP = 3;
const RULER_HEIGHT = 24;
const MIN_BP_PER_PX = 0.05;
const MAX_BP_PER_PX = 100;

const SEQ_COLORS: Record<string, string> = {
    A: "#5CB85C", T: "#D9534F", G: "#F0AD4E", C: "#4A90D9",
};

export default function LinearViewer({
    sequence,
    features,
    selectedFeatureId,
    onSelectFeature,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 800, h: 500 });
    const [bpPerPx, setBpPerPx] = useState(5); // zoom level
    const [scrollBp, setScrollBp] = useState(0); // left-most bp visible
    const [dragging, setDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartBp, setDragStartBp] = useState(0);
    const [hoverFeature, setHoverFeature] = useState<number | null>(null);

    const seqLen = sequence.length;

    // Resize observer
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSize({ w: Math.floor(width), h: Math.floor(height) });
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // Auto-fit on first load
    useEffect(() => {
        if (seqLen > 0 && size.w > 0) {
            setBpPerPx(seqLen / size.w);
        }
    }, [seqLen > 0 ? 1 : 0]); // only on first meaningful load

    // Draw
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size.w * dpr;
        canvas.height = size.h * dpr;
        canvas.style.width = size.w + "px";
        canvas.style.height = size.h + "px";

        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size.w, size.h);

        const visibleBps = size.w * bpPerPx;
        const startBp = Math.max(0, Math.floor(scrollBp));
        const endBp = Math.min(seqLen, Math.ceil(scrollBp + visibleBps));

        const bpToX = (bp: number) => (bp - scrollBp) / bpPerPx;

        // ── Layout Y positions ──
        const rulerY = 24;
        const backboneY = rulerY + RULER_HEIGHT + 20;
        const featureStartY = backboneY + 20;

        // ── Ruler ──
        const tickInterval = getRulerInterval(bpPerPx);
        const firstTick = Math.ceil(startBp / tickInterval) * tickInterval;

        ctx.strokeStyle = "#3a3a4a";
        ctx.fillStyle = "#6a6a7a";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";

        for (let bp = firstTick; bp <= endBp; bp += tickInterval) {
            const x = bpToX(bp);
            const isMajor = bp % (tickInterval * 5) === 0;
            ctx.beginPath();
            ctx.moveTo(x, rulerY + RULER_HEIGHT);
            ctx.lineTo(x, rulerY + RULER_HEIGHT - (isMajor ? 10 : 5));
            ctx.lineWidth = 1;
            ctx.stroke();

            if (isMajor) {
                ctx.fillText(formatBp(bp), x, rulerY + 10);
            }
        }

        // ── Backbone line ──
        ctx.beginPath();
        ctx.moveTo(bpToX(startBp), backboneY);
        ctx.lineTo(bpToX(endBp), backboneY);
        ctx.strokeStyle = "#555568";
        ctx.lineWidth = 2;
        ctx.stroke();

        // ── Sequence letters (when zoomed in enough) ──
        if (bpPerPx < 0.8) {
            const fontSize = Math.min(14, Math.max(8, 1 / bpPerPx * 0.8));
            ctx.font = `${fontSize}px JetBrains Mono, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            for (let i = Math.max(0, startBp); i < Math.min(seqLen, endBp); i++) {
                const x = bpToX(i + 0.5);
                const char = sequence[i];
                ctx.fillStyle = SEQ_COLORS[char] || "#888";
                ctx.fillText(char, x, backboneY);
            }

            // Complement strand
            const compMap: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
            for (let i = Math.max(0, startBp); i < Math.min(seqLen, endBp); i++) {
                const x = bpToX(i + 0.5);
                const char = compMap[sequence[i]] || "N";
                ctx.fillStyle = SEQ_COLORS[char] || "#888";
                ctx.globalAlpha = 0.5;
                ctx.fillText(char, x, backboneY + fontSize + 4);
                ctx.globalAlpha = 1;
            }
        }

        // ── Feature tracks ──
        const tracks = assignLinearTracks(features);

        tracks.forEach(({ feature, track }) => {
            const x1 = bpToX(feature.start);
            const x2 = bpToX(feature.end);
            const y = featureStartY + track * (TRACK_HEIGHT + TRACK_GAP);
            const w = x2 - x1;

            if (x2 < 0 || x1 > size.w) return; // culling

            const isSelected = feature.id === selectedFeatureId;
            const isHovered = feature.id === hoverFeature;

            // Background bar
            ctx.fillStyle = feature.color;
            ctx.globalAlpha = isSelected ? 0.9 : isHovered ? 0.7 : 0.5;
            const radius = Math.min(4, w / 2);
            roundRect(ctx, x1, y, w, TRACK_HEIGHT, radius);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Selection border
            if (isSelected) {
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1.5;
                roundRect(ctx, x1, y, w, TRACK_HEIGHT, radius);
                ctx.stroke();
            }

            // Direction arrow
            if (["CDS", "gene", "mRNA"].includes(feature.type)) {
                const arrowSize = Math.min(6, TRACK_HEIGHT / 2);
                const arrowX = feature.strand === 1 ? x2 : x1;
                const arrowDir = feature.strand === 1 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(arrowX, y + TRACK_HEIGHT / 2);
                ctx.lineTo(arrowX - arrowDir * arrowSize, y + 2);
                ctx.lineTo(arrowX - arrowDir * arrowSize, y + TRACK_HEIGHT - 2);
                ctx.closePath();
                ctx.fillStyle = feature.color;
                ctx.fill();
            }

            // Label
            if (feature.label && w > 30) {
                ctx.font = `${isSelected ? "600" : "400"} 10px Inter, sans-serif`;
                ctx.fillStyle = "#fff";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                const maxLabelW = w - 8;
                const text = truncateText(ctx, feature.label, maxLabelW);
                ctx.fillText(text, x1 + 4, y + TRACK_HEIGHT / 2);
            }
        });
    }, [sequence, features, size, bpPerPx, scrollBp, selectedFeatureId, hoverFeature, seqLen]);

    // ── Mouse handlers ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseBp = scrollBp + mouseX * bpPerPx;

        const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
        const newBpPerPx = Math.min(MAX_BP_PER_PX, Math.max(MIN_BP_PER_PX, bpPerPx * factor));

        // Keep mouse position stable
        const newScrollBp = mouseBp - mouseX * newBpPerPx;
        setBpPerPx(newBpPerPx);
        setScrollBp(Math.max(0, Math.min(seqLen - size.w * newBpPerPx, newScrollBp)));
    }, [bpPerPx, scrollBp, seqLen, size.w]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setDragging(true);
        setDragStartX(e.clientX);
        setDragStartBp(scrollBp);
    }, [scrollBp]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (dragging) {
            const dx = e.clientX - dragStartX;
            const newScroll = dragStartBp - dx * bpPerPx;
            setScrollBp(Math.max(0, Math.min(seqLen - size.w * bpPerPx, newScroll)));
            return;
        }

        // Hit test
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const rulerY = 24;
        const backboneY = rulerY + RULER_HEIGHT + 20;
        const featureStartY = backboneY + 20;

        const bpToX = (bp: number) => (bp - scrollBp) / bpPerPx;

        const tracks = assignLinearTracks(features);
        let found: number | null = null;
        for (const { feature, track } of tracks) {
            const x1 = bpToX(feature.start);
            const x2 = bpToX(feature.end);
            const y = featureStartY + track * (TRACK_HEIGHT + TRACK_GAP);
            if (mx >= x1 && mx <= x2 && my >= y && my <= y + TRACK_HEIGHT) {
                found = feature.id;
                break;
            }
        }
        setHoverFeature(found);
        canvas.style.cursor = found ? "pointer" : dragging ? "grabbing" : "grab";
    }, [dragging, dragStartX, dragStartBp, bpPerPx, scrollBp, seqLen, size.w, features]);

    const handleMouseUp = useCallback(() => setDragging(false), []);

    const handleClick = useCallback(() => {
        onSelectFeature(hoverFeature);
    }, [hoverFeature, onSelectFeature]);

    const zoomIn = () => {
        const center = scrollBp + (size.w * bpPerPx) / 2;
        const newBpp = Math.max(MIN_BP_PER_PX, bpPerPx / 1.3);
        setScrollBp(Math.max(0, center - (size.w * newBpp) / 2));
        setBpPerPx(newBpp);
    };

    const zoomOut = () => {
        const center = scrollBp + (size.w * bpPerPx) / 2;
        const newBpp = Math.min(MAX_BP_PER_PX, bpPerPx * 1.3);
        setScrollBp(Math.max(0, center - (size.w * newBpp) / 2));
        setBpPerPx(newBpp);
    };

    const zoomFit = () => {
        setBpPerPx(seqLen / size.w);
        setScrollBp(0);
    };

    return (
        <div ref={containerRef} className="view-canvas-container">
            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleClick}
                style={{ cursor: "grab" }}
            />
            <div className="zoom-controls">
                <button onClick={zoomIn}>+</button>
                <span className="zoom-label">{bpPerPx < 1 ? `${(1 / bpPerPx).toFixed(0)}px/bp` : `${bpPerPx.toFixed(0)}bp/px`}</span>
                <button onClick={zoomOut}>−</button>
                <button onClick={zoomFit} title="Fit">⊞</button>
            </div>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────

function getRulerInterval(bpPerPx: number): number {
    const target = bpPerPx * 60; // ~60px between ticks
    const magnitudes = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    return magnitudes.find((m) => m >= target) || 10000;
}

function formatBp(bp: number): string {
    if (bp >= 1000) return (bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1) + "k";
    return bp.toString();
}

function assignLinearTracks(features: Feature[]) {
    const sorted = [...features].sort((a, b) => a.start - b.start);
    const result: { feature: Feature; track: number }[] = [];
    const trackEnds: number[] = [];

    for (const feat of sorted) {
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            if (feat.start >= trackEnds[t]) {
                result.push({ feature: feat, track: t });
                trackEnds[t] = feat.end;
                placed = true;
                break;
            }
        }
        if (!placed) {
            result.push({ feature: feat, track: trackEnds.length });
            trackEnds.push(feat.end);
        }
    }
    return result;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + "…";
}
