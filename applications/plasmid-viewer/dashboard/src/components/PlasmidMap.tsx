"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Feature } from "@/lib/api";

interface Props {
    sequence: string;
    features: Feature[];
    topology: string;
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
}

const BACKBONE_COLOR = "#555568";
const TICK_COLOR = "#3a3a4a";
const LABEL_COLOR = "#a0a0b4";
const SEQ_COLORS: Record<string, string> = {
    A: "#5CB85C", T: "#D9534F", G: "#F0AD4E", C: "#4A90D9",
};

export default function PlasmidMap({
    sequence,
    features,
    topology,
    selectedFeatureId,
    onSelectFeature,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0); // radians
    const [dragging, setDragging] = useState(false);
    const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ w: 800, h: 600 });
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

    // bp → angle
    const bpToAngle = useCallback(
        (bp: number) => ((bp / seqLen) * Math.PI * 2 - Math.PI / 2 + rotation),
        [seqLen, rotation]
    );

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

        const cx = size.w / 2;
        const cy = size.h / 2;
        const baseRadius = Math.min(cx, cy) * 0.6 * zoom;
        const clampedRadius = Math.max(baseRadius, 60);

        // ── Backbone circle ──
        ctx.beginPath();
        ctx.arc(cx, cy, clampedRadius, 0, Math.PI * 2);
        ctx.strokeStyle = BACKBONE_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // ── Tick marks & bp labels ──
        const bpPerTick = getBpPerTick(seqLen);
        for (let bp = 0; bp < seqLen; bp += bpPerTick) {
            const angle = bpToAngle(bp);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const isMajor = bp % (bpPerTick * 5) === 0;
            const tickLen = isMajor ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(cx + cos * clampedRadius, cy + sin * clampedRadius);
            ctx.lineTo(cx + cos * (clampedRadius + tickLen), cy + sin * (clampedRadius + tickLen));
            ctx.strokeStyle = TICK_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (isMajor && zoom > 0.5) {
                ctx.save();
                ctx.translate(cx + cos * (clampedRadius + tickLen + 14), cy + sin * (clampedRadius + tickLen + 14));
                ctx.font = "10px Inter, sans-serif";
                ctx.fillStyle = LABEL_COLOR;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(formatBp(bp), 0, 0);
                ctx.restore();
            }
        }

        // ── Sequence letters (only at high zoom) ──
        if (zoom > 8 && clampedRadius > 100) {
            const arcPerBp = (Math.PI * 2) / seqLen;
            const visibleBps = Math.min(seqLen, Math.floor((Math.PI * 2 * clampedRadius) / 10));
            // Only render visible characters
            const startAngle = -Math.PI / 2 + rotation - (Math.PI);
            const endAngle = -Math.PI / 2 + rotation + (Math.PI);
            for (let i = 0; i < seqLen; i++) {
                const angle = bpToAngle(i);
                // Skip if not visible
                const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                if (visibleBps < seqLen) {
                    // good enough approximation for culling
                }
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const char = sequence[i];
                ctx.save();
                ctx.translate(cx + cos * clampedRadius, cy + sin * clampedRadius);
                ctx.rotate(angle + Math.PI / 2);
                ctx.font = `${Math.min(11, clampedRadius * arcPerBp * 0.7)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace'}`;
                ctx.fillStyle = SEQ_COLORS[char] || "#888";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(char, 0, 0);
                ctx.restore();
            }
        }

        // ── Feature arcs ──
        const trackWidth = Math.max(14, 20 * zoom);
        const featureRadius = clampedRadius - trackWidth - 4;

        // Stack overlapping features
        const tracks = assignTracks(features, seqLen);

        tracks.forEach(({ feature, track }) => {
            const startAngle = bpToAngle(feature.start);
            const endAngle = bpToAngle(feature.end);
            const r = featureRadius - track * (trackWidth + 3);
            if (r < 20) return;

            const isSelected = feature.id === selectedFeatureId;
            const isHovered = feature.id === hoverFeature;

            // Arc
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.strokeStyle = feature.color;
            ctx.lineWidth = isSelected ? trackWidth + 2 : isHovered ? trackWidth + 1 : trackWidth;
            ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.9 : 0.75;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Direction arrow for CDS/gene features
            if (["CDS", "gene", "mRNA"].includes(feature.type)) {
                const arrowAngle = feature.strand === 1 ? endAngle : startAngle;
                const arrowDir = feature.strand === 1 ? 1 : -1;
                const arrowCos = Math.cos(arrowAngle);
                const arrowSin = Math.sin(arrowAngle);
                const perpCos = Math.cos(arrowAngle - (Math.PI / 2) * arrowDir);
                const perpSin = Math.sin(arrowAngle - (Math.PI / 2) * arrowDir);

                ctx.beginPath();
                ctx.moveTo(cx + arrowCos * r, cy + arrowSin * r);
                ctx.lineTo(
                    cx + arrowCos * r + perpCos * 8,
                    cy + arrowSin * r + perpSin * 8
                );
                ctx.fillStyle = feature.color;
                ctx.globalAlpha = isSelected ? 1 : 0.75;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Label
            if (feature.label && zoom > 0.6) {
                const midAngle = (startAngle + endAngle) / 2;
                // Adjust for wrap-around
                const labelR = r - trackWidth / 2 - 12;
                if (labelR > 15) {
                    const lx = cx + Math.cos(midAngle) * labelR;
                    const ly = cy + Math.sin(midAngle) * labelR;
                    ctx.save();
                    ctx.translate(lx, ly);
                    const textAngle = midAngle + Math.PI / 2;
                    // Flip text if upside down
                    const flip = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
                    ctx.rotate(flip ? textAngle + Math.PI : textAngle);
                    ctx.font = `${isSelected ? "600" : "500"} ${Math.min(11, 10 * zoom)}px Inter, sans-serif`;
                    ctx.fillStyle = isSelected ? "#fff" : LABEL_COLOR;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(feature.label, 0, 0);
                    ctx.restore();
                }
            }
        });

        // ── Center text ──
        ctx.font = "600 14px Inter, sans-serif";
        ctx.fillStyle = "#e0e0e8";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Show plasmid name would need a prop; show length instead
        ctx.fillText(`${seqLen.toLocaleString()} bp`, cx, cy - 8);
        ctx.font = "400 11px Inter, sans-serif";
        ctx.fillStyle = "#6a6a7a";
        ctx.fillText(topology, cx, cy + 10);
    }, [sequence, features, zoom, rotation, size, selectedFeatureId, hoverFeature, bpToAngle, seqLen, topology]);

    // ── Mouse handlers ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.min(Math.max(z * delta, 0.3), 20));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setDragging(true);
        setLastMouse({ x: e.clientX, y: e.clientY });
    }, []);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (dragging) {
                const dx = e.clientX - lastMouse.x;
                const dy = e.clientY - lastMouse.y;
                // Calculate rotation based on tangential mouse movement
                const canvas = canvasRef.current;
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const cx = rect.width / 2;
                    const cy = rect.height / 2;
                    const mx = e.clientX - rect.left;
                    const my = e.clientY - rect.top;
                    const angle1 = Math.atan2(lastMouse.y - rect.top - cy, lastMouse.x - rect.left - cx);
                    const angle2 = Math.atan2(my - cy, mx - cx);
                    setRotation((r) => r + (angle2 - angle1));
                }
                setLastMouse({ x: e.clientX, y: e.clientY });
            } else {
                // Hit test for hover
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                const mouseAngle = Math.atan2(my - cy, mx - cx);
                const baseRadius = Math.min(cx, cy) * 0.6 * zoom;
                const clampedRadius = Math.max(baseRadius, 60);
                const trackWidth = Math.max(14, 20 * zoom);

                let found: number | null = null;
                for (const feat of features) {
                    const startAngle = bpToAngle(feat.start);
                    const endAngle = bpToAngle(feat.end);
                    const featureRadius = clampedRadius - trackWidth - 4;
                    const hitR = Math.abs(dist - featureRadius) < trackWidth;
                    if (hitR) {
                        let normMouse = ((mouseAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                        let normStart = ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                        let normEnd = ((endAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                        if (normStart <= normEnd) {
                            if (normMouse >= normStart && normMouse <= normEnd) { found = feat.id; break; }
                        } else {
                            if (normMouse >= normStart || normMouse <= normEnd) { found = feat.id; break; }
                        }
                    }
                }
                setHoverFeature(found);
                canvas.style.cursor = found ? "pointer" : dragging ? "grabbing" : "grab";
            }
        },
        [dragging, lastMouse, features, zoom, bpToAngle]
    );

    const handleMouseUp = useCallback(() => setDragging(false), []);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (hoverFeature !== null) {
                onSelectFeature(hoverFeature);
            } else {
                onSelectFeature(null);
            }
        },
        [hoverFeature, onSelectFeature]
    );

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
                <button onClick={() => setZoom((z) => Math.min(z * 1.3, 20))}>+</button>
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.max(z / 1.3, 0.3))}>−</button>
                <button onClick={() => { setZoom(1); setRotation(0); }} title="Reset">⟲</button>
            </div>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────

function getBpPerTick(seqLen: number): number {
    if (seqLen < 500) return 50;
    if (seqLen < 2000) return 100;
    if (seqLen < 5000) return 250;
    if (seqLen < 15000) return 500;
    if (seqLen < 50000) return 1000;
    return 5000;
}

function formatBp(bp: number): string {
    if (bp >= 1000) return (bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1) + "k";
    return bp.toString();
}

function assignTracks(features: Feature[], seqLen: number) {
    const sorted = [...features].sort((a, b) => a.start - b.start);
    const tracks: { feature: Feature; track: number }[] = [];
    const trackEnds: number[] = [];

    for (const feat of sorted) {
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            if (feat.start >= trackEnds[t]) {
                tracks.push({ feature: feat, track: t });
                trackEnds[t] = feat.end;
                placed = true;
                break;
            }
        }
        if (!placed) {
            tracks.push({ feature: feat, track: trackEnds.length });
            trackEnds.push(feat.end);
        }
    }

    return tracks;
}
