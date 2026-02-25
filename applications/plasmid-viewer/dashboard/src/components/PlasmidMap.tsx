"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Feature, Orf } from "@/lib/api";

interface Props {
    sequence: string;
    features: Feature[];
    topology: string;
    selectedFeatureId: number | null;
    multiSelectedIds?: Set<number>;
    onSelectFeature: (id: number | null, multiToggle?: boolean) => void;
    selectionRange: { start: number; end: number } | null;
    onSelectionRange: (range: { start: number; end: number } | null) => void;
    onDeleteFeature?: () => void;
    ghostOrfs?: Orf[];
}

/* ── Constants ─────────────────────────────────────────────────────── */

const BACKBONE_COLOR = "#5a5a70";
const BACKBONE_WIDTH = 4;

const NEON_FEATURE_COLORS: Record<string, string> = {
    CDS: "#00FF88", gene: "#00CCFF", promoter: "#FF00FF", terminator: "#FF3333",
    primer_bind: "#FFFF00", rep_origin: "#FF8800", RBS: "#AA00FF",
    misc_feature: "#00FFCC", regulatory: "#FF66CC", mRNA: "#66FF66",
    sig_peptide: "#FFAA00", misc_binding: "#00FFAA", protein_bind: "#FF88FF",
    "5'UTR": "#88FFFF", "3'UTR": "#FFFF88", enhancer: "#FF6688",
};
const TICK_COLOR = "#3a3a4a";
const LABEL_COLOR = "#b0b0c8";
const SEQ_COLORS: Record<string, string> = {
    A: "#39FF14", T: "#FF3131", G: "#FFD700", C: "#00D4FF",
};
const COMPLEMENT: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };

const TRACK_THICK: Record<string, number> = {
    CDS: 16, gene: 16, mRNA: 14,
    promoter: 10, terminator: 10, RBS: 8,
    rep_origin: 12, primer_bind: 6,
};
const TRACK_DEFAULT = 10;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 80;
const ZOOM_TRANSITION_START = 1.2;
const ZOOM_TRANSITION_END = 1.7;
const ROTATE_SPEED = 0.002;

const CODON_TABLE: Record<string, string> = {
    TTT: "F", TTC: "F", TTA: "L", TTG: "L", CTT: "L", CTC: "L", CTA: "L", CTG: "L",
    ATT: "I", ATC: "I", ATA: "I", ATG: "M", GTT: "V", GTC: "V", GTA: "V", GTG: "V",
    TCT: "S", TCC: "S", TCA: "S", TCG: "S", CCT: "P", CCC: "P", CCA: "P", CCG: "P",
    ACT: "T", ACC: "T", ACA: "T", ACG: "T", GCT: "A", GCC: "A", GCA: "A", GCG: "A",
    TAT: "Y", TAC: "Y", TAA: "*", TAG: "*", CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
    AAT: "N", AAC: "N", AAA: "K", AAG: "K", GAT: "D", GAC: "D", GAA: "E", GAG: "E",
    TGT: "C", TGC: "C", TGA: "*", TGG: "W", CGT: "R", CGC: "R", CGA: "R", CGG: "R",
    AGT: "S", AGC: "S", AGA: "R", AGG: "R", GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

/* ── Component ─────────────────────────────────────────────────────── */

export default function PlasmidMap({
    sequence, features, topology,
    selectedFeatureId, multiSelectedIds,
    onSelectFeature,
    selectionRange, onSelectionRange,
    onDeleteFeature, ghostOrfs,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const zoomRef = useRef(1);
    const rotationRef = useRef(0);

    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [hoverFeature, setHoverFeature] = useState<number | null>(null);
    const [hoverBp, setHoverBp] = useState<number | null>(null);

    // Drag-select state
    const dragSelecting = useRef(false);
    const dragStart = useRef<number | null>(null);

    // Context menu
    const [ctxMenu, setCtxMenu] = useState<{
        x: number; y: number;
        featureId: number | null;
        bp: number | null;
    } | null>(null);

    // Track whether selection was auto-rotated already
    const autoRotatedFor = useRef<number | null>(null);

    const seqLen = sequence.length;

    /* ── Resize ── */
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

    // Close context menu on click anywhere
    useEffect(() => {
        const handler = () => setCtxMenu(null);
        window.addEventListener("click", handler);
        return () => window.removeEventListener("click", handler);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                const hasSelection = selectedFeatureId !== null || (multiSelectedIds && multiSelectedIds.size > 0);
                if (hasSelection && onDeleteFeature && !(e.target instanceof HTMLInputElement)) {
                    e.preventDefault();
                    onDeleteFeature();
                }
            }
            if (e.key === "Escape") {
                onSelectFeature(null);
                onSelectionRange(null);
                setCtxMenu(null);
            }
            // Ctrl+C / Cmd+C: copy selected sequence
            if ((e.ctrlKey || e.metaKey) && e.key === "c" && !(e.target instanceof HTMLInputElement)) {
                if (selectionRange) {
                    const { start, end } = selectionRange;
                    const sub = start < end ? sequence.slice(start, end) : sequence.slice(start) + sequence.slice(0, end);
                    navigator.clipboard.writeText(sub);
                } else if (selectedFeatureId !== null) {
                    const feat = features.find((f) => f.id === selectedFeatureId);
                    if (feat) {
                        const sub = feat.start < feat.end
                            ? sequence.slice(feat.start, feat.end)
                            : sequence.slice(feat.start) + sequence.slice(0, feat.end);
                        navigator.clipboard.writeText(sub);
                    }
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [selectedFeatureId, multiSelectedIds, onDeleteFeature, onSelectFeature, onSelectionRange, selectionRange, sequence, features]);

    /* ── bp ↔ angle ── */
    const bpToAngle = useCallback(
        (bp: number) => (bp / seqLen) * Math.PI * 2 - Math.PI / 2 + rotationRef.current,
        [seqLen]
    );

    const angleToBp = useCallback(
        (angle: number) => {
            let delta = angle - (-Math.PI / 2 + rotationRef.current);
            delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            return Math.round((delta / (Math.PI * 2)) * seqLen) % seqLen;
        },
        [seqLen]
    );

    /* ── Layout: camera-only translation ── */
    const getLayout = useCallback(() => {
        const z = zoomRef.current;
        const naturalR = Math.min(size.w, size.h) * 0.38;
        const r = naturalR * z;

        // Transition factor: 0 at ≤120%, 1 at ≥170%
        const t = Math.min(1, Math.max(0, (z - ZOOM_TRANSITION_START) / (ZOOM_TRANSITION_END - ZOOM_TRANSITION_START)));
        const ease = t * t * (3 - 2 * t); // smoothstep

        // At ease=0: circle center = viewport center
        // At ease=1: 12 o'clock point on backbone = viewport center
        //   → circle center is at (vpW/2, vpH/2 + r)  since 12 o'clock = top = center - r in Y
        const cx = size.w / 2;
        const cy = size.h / 2 + ease * r;

        return { cx, cy, r };
    }, [size]);

    /* ── Auto-rotate selection to 12 o'clock ── */
    // When a feature is selected AND we haven't auto-rotated for it yet,
    // rotate so its midpoint sits at 12 o'clock
    useEffect(() => {
        if (selectedFeatureId !== null && autoRotatedFor.current !== selectedFeatureId) {
            const feat = features.find((f) => f.id === selectedFeatureId);
            if (feat) {
                const midBp = feat.start < feat.end
                    ? (feat.start + feat.end) / 2
                    : ((feat.start + feat.end + seqLen) / 2) % seqLen;
                // Rotate so midBp is at 12 o'clock (angle = -π/2)
                // bpToAngle(midBp) = (midBp/seqLen)*2π − π/2 + rotation = −π/2
                // → rotation = −(midBp/seqLen)*2π
                rotationRef.current = -(midBp / seqLen) * Math.PI * 2;
                setRotation(rotationRef.current);
                autoRotatedFor.current = selectedFeatureId;
            }
        } else if (selectedFeatureId === null) {
            autoRotatedFor.current = null;
        }
    }, [selectedFeatureId, features, seqLen]);

    /* ── DRAW ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || seqLen === 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size.w * dpr;
        canvas.height = size.h * dpr;
        canvas.style.width = size.w + "px";
        canvas.style.height = size.h + "px";

        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size.w, size.h);

        const { cx, cy, r } = getLayout();
        const z = zoomRef.current;

        /* ── Backbone ── */
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = BACKBONE_COLOR;
        ctx.lineWidth = BACKBONE_WIDTH;
        ctx.stroke();

        /* ── Selection arc overlay ── */
        if (selectionRange) {
            const sAngle = bpToAngle(selectionRange.start);
            const eAngle = bpToAngle(selectionRange.end);
            ctx.beginPath();
            ctx.arc(cx, cy, r, sAngle, eAngle);
            ctx.strokeStyle = "rgba(74, 124, 255, 0.6)";
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        /* ── Ruler ticks ── */
        const bpPerTick = getTickInterval(seqLen, z);
        const majorEvery = 5;
        for (let bp = 0; bp < seqLen; bp += bpPerTick) {
            const angle = bpToAngle(bp);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const isMajor = bp % (bpPerTick * majorEvery) === 0;
            const tickLen = isMajor ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(cx + cos * r, cy + sin * r);
            ctx.lineTo(cx + cos * (r + tickLen), cy + sin * (r + tickLen));
            ctx.strokeStyle = TICK_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (isMajor) {
                ctx.save();
                ctx.translate(cx + cos * (r + tickLen + 12), cy + sin * (r + tickLen + 12));
                ctx.font = "10px Inter, sans-serif";
                ctx.fillStyle = LABEL_COLOR;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(formatBp(bp), 0, 0);
                ctx.restore();
            }
        }

        /* ── Feature arcs ── */
        const tracks = assignTracks(features, seqLen);
        const labelInfos: { angle: number; r: number; text: string; color: string; selected: boolean }[] = [];

        // At high zoom, compute strandOffset for placing arcs above nucleotides
        const hiZoom = z > 6 && r > 100;
        const hiArcPerBp = (Math.PI * 2) / seqLen;
        const hiArcPx = r * hiArcPerBp;
        const hiFontSize = Math.max(5, Math.min(14, hiArcPx * 0.55));
        const hiStrandOff = hiFontSize * 0.7 + 3;

        // Viewport center angle for consistent text direction
        const viewAngle = Math.atan2(size.h / 2 - cy, size.w / 2 - cx);
        const viewNorm = ((viewAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const viewFlip = viewNorm > Math.PI / 2 && viewNorm < (3 * Math.PI) / 2;

        tracks.forEach(({ feature, track }) => {
            const startAngle = bpToAngle(feature.start);
            const endAngle = bpToAngle(feature.end);
            // At high zoom: enforce minimum 14px thickness so all features are readable
            const rawThickness = TRACK_THICK[feature.type] || TRACK_DEFAULT;
            const thickness = hiZoom ? Math.max(14, rawThickness) : rawThickness;
            const gap = 3;
            // At high zoom: place arcs OUTSIDE nucleotides. At low zoom: inside backbone.
            const featureR = hiZoom
                ? r + hiStrandOff + 22 + track * (thickness + gap)
                : r - 8 - track * (18 + gap);
            if (featureR < 20) return;

            const isSelected = feature.id === selectedFeatureId || (multiSelectedIds?.has(feature.id) ?? false);
            const isHovered = feature.id === hoverFeature;
            const halfT = thickness / 2;
            const outerR = featureR + halfT;
            const innerR = featureR - halfT;

            ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.9 : 0.75;

            const isDirectional = ["CDS", "gene", "mRNA", "promoter", "primer_bind"].includes(feature.type);

            if (isDirectional) {
                // Clamp arrow tip to max 12px arc length
                const maxTipPx = 12;
                const maxTipAngle = featureR > 0 ? maxTipPx / featureR : 0.08;
                const arrowAngle = Math.min(maxTipAngle, (endAngle - startAngle) * 0.25);
                const tipAngle = feature.strand === 1 ? endAngle : startAngle;
                const bodyEnd = feature.strand === 1 ? endAngle - arrowAngle : startAngle + arrowAngle;

                ctx.beginPath();
                if (feature.strand === 1) {
                    ctx.arc(cx, cy, outerR, startAngle, bodyEnd);
                    ctx.lineTo(cx + Math.cos(tipAngle) * featureR, cy + Math.sin(tipAngle) * featureR);
                    ctx.arc(cx, cy, innerR, bodyEnd, startAngle, true);
                } else {
                    ctx.arc(cx, cy, outerR, bodyEnd, endAngle);
                    ctx.arc(cx, cy, innerR, endAngle, bodyEnd, true);
                    ctx.lineTo(cx + Math.cos(tipAngle) * featureR, cy + Math.sin(tipAngle) * featureR);
                }
                ctx.closePath();
                ctx.fillStyle = NEON_FEATURE_COLORS[feature.type] || feature.color;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, outerR, startAngle, endAngle);
                ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
                ctx.closePath();
                ctx.fillStyle = NEON_FEATURE_COLORS[feature.type] || feature.color;
                ctx.fill();
            }

            if (isSelected) {
                // Subtle glow instead of bounding box
                ctx.save();
                ctx.shadowColor = "#ffffff";
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(cx, cy, featureR, startAngle, endAngle);
                ctx.strokeStyle = "rgba(255,255,255,0.6)";
                ctx.lineWidth = thickness + 4;
                ctx.stroke();
                ctx.restore();
            }

            ctx.globalAlpha = 1;

            // Inline label: render along the arc curve if it fits
            if (feature.label) {
                const arcSpan = (endAngle - startAngle) * featureR;
                const midAngle = (startAngle + endAngle) / 2;
                const labelFontSize = Math.min(thickness - 2, 11);
                ctx.font = `600 ${labelFontSize}px Inter, sans-serif`;
                const charWidths = feature.label.split("").map((c: string) => ctx.measureText(c).width);
                const totalWidth = charWidths.reduce((a: number, b: number) => a + b, 0);

                if (arcSpan > totalWidth + 8) {
                    const labelR = featureR;
                    const totalArcAngle = totalWidth / labelR;
                    const chars = feature.label.split("");

                    // Use viewport-center approach at high zoom for consistent text direction
                    const reverseDirection = hiZoom ? viewFlip : (() => {
                        const textMidNorm = ((midAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                        return textMidNorm > Math.PI / 2 && textMidNorm < (3 * Math.PI) / 2;
                    })();

                    let currentAngle: number;

                    if (reverseDirection) {
                        currentAngle = midAngle + totalArcAngle / 2;
                        for (let ci = 0; ci < chars.length; ci++) {
                            const charAngle = charWidths[ci] / labelR;
                            currentAngle -= charAngle / 2;
                            ctx.save();
                            ctx.translate(cx + Math.cos(currentAngle) * labelR, cy + Math.sin(currentAngle) * labelR);
                            ctx.rotate(currentAngle - Math.PI / 2);
                            ctx.fillStyle = "#fff";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(chars[ci], 0, 0);
                            ctx.restore();
                            currentAngle -= charAngle / 2;
                        }
                    } else {
                        currentAngle = midAngle - totalArcAngle / 2;
                        for (let ci = 0; ci < chars.length; ci++) {
                            const charAngle = charWidths[ci] / labelR;
                            currentAngle += charAngle / 2;
                            ctx.save();
                            ctx.translate(cx + Math.cos(currentAngle) * labelR, cy + Math.sin(currentAngle) * labelR);
                            ctx.rotate(currentAngle + Math.PI / 2);
                            ctx.fillStyle = "#fff";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(chars[ci], 0, 0);
                            ctx.restore();
                            currentAngle += charAngle / 2;
                        }
                    }
                } else {
                    // External label with leader line
                    labelInfos.push({ angle: midAngle, r: outerR, text: feature.label, color: feature.color, selected: isSelected });
                }
            }
        });

        /* ── Ghost ORF preview arcs (before commit) ── */
        if (ghostOrfs && ghostOrfs.length > 0) {
            ctx.globalAlpha = 0.3;
            ctx.setLineDash([6, 4]);
            for (const orf of ghostOrfs) {
                const sa = bpToAngle(orf.start);
                const ea = bpToAngle(orf.end);
                ctx.beginPath();
                ctx.arc(cx, cy, r - 4, sa, ea);
                ctx.strokeStyle = orf.color;
                ctx.lineWidth = 8;
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        /* ── Label collision avoidance: spread to distinct radii ── */
        if (labelInfos.length > 0) {
            // Priority: selected first, then non-ORF, then ORFs
            labelInfos.sort((a, b) => {
                if (a.selected !== b.selected) return a.selected ? -1 : 1;
                const aIsOrf = a.text.startsWith("ORF");
                const bIsOrf = b.text.startsWith("ORF");
                if (aIsOrf !== bIsOrf) return aIsOrf ? 1 : -1;
                const na = ((a.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const nb = ((b.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                return na - nb;
            });

            const labelPositions: { lx: number; ly: number; info: typeof labelInfos[0]; offsetR: number }[] = [];
            const minGap = 28;
            const maxOffset = 8;

            for (const info of labelInfos) {
                let offsetR = r + 32;
                let lx = cx + Math.cos(info.angle) * offsetR;
                let ly = cy + Math.sin(info.angle) * offsetR;
                let canPlace = true;

                for (let attempt = 0; attempt <= maxOffset; attempt++) {
                    let collision = false;
                    for (const placed of labelPositions) {
                        if (Math.sqrt((lx - placed.lx) ** 2 + (ly - placed.ly) ** 2) < minGap) {
                            collision = true; break;
                        }
                    }
                    if (!collision) { canPlace = true; break; }
                    if (attempt === maxOffset) { canPlace = false; break; }
                    offsetR += 20;
                    lx = cx + Math.cos(info.angle) * offsetR;
                    ly = cy + Math.sin(info.angle) * offsetR;
                }

                // Always show selected labels, skip unplaceable others
                if (!canPlace && !info.selected) continue;
                labelPositions.push({ lx, ly, info, offsetR });
            }

            for (const { lx, ly, info, offsetR } of labelPositions) {
                // Skip labels far off-screen
                if (lx < -50 || lx > size.w + 50 || ly < -50 || ly > size.h + 50) continue;

                // Leader line
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(info.angle) * (info.r + 2), cy + Math.sin(info.angle) * (info.r + 2));
                ctx.lineTo(cx + Math.cos(info.angle) * (offsetR - 6), cy + Math.sin(info.angle) * (offsetR - 6));
                ctx.strokeStyle = info.color;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;

                // External label: render characters along the arc at offsetR
                const labelR2 = offsetR;
                const labelFontSize2 = info.selected ? 11 : 10;
                ctx.font = `${info.selected ? "600" : "400"} ${labelFontSize2}px Inter, sans-serif`;
                const chars2 = info.text.split("");
                const charWidths2 = chars2.map((c: string) => ctx.measureText(c).width);
                const totalW2 = charWidths2.reduce((a: number, b: number) => a + b, 0);
                const totalArcAngle2 = totalW2 / labelR2;

                // Use viewport-center approach at high zoom for consistent text direction
                const reverse2 = hiZoom ? viewFlip : (() => {
                    const normMid = ((info.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    return normMid > Math.PI / 2 && normMid < (3 * Math.PI) / 2;
                })();

                let ca2 = reverse2 ? info.angle + totalArcAngle2 / 2 : info.angle - totalArcAngle2 / 2;
                for (let ci = 0; ci < chars2.length; ci++) {
                    const charA = charWidths2[ci] / labelR2;
                    if (reverse2) {
                        ca2 -= charA / 2;
                        ctx.save();
                        ctx.translate(cx + Math.cos(ca2) * labelR2, cy + Math.sin(ca2) * labelR2);
                        ctx.rotate(ca2 - Math.PI / 2);
                        ctx.fillStyle = info.selected ? "#fff" : LABEL_COLOR;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(chars2[ci], 0, 0);
                        ctx.restore();
                        ca2 -= charA / 2;
                    } else {
                        ca2 += charA / 2;
                        ctx.save();
                        ctx.translate(cx + Math.cos(ca2) * labelR2, cy + Math.sin(ca2) * labelR2);
                        ctx.rotate(ca2 + Math.PI / 2);
                        ctx.fillStyle = info.selected ? "#fff" : LABEL_COLOR;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(chars2[ci], 0, 0);
                        ctx.restore();
                        ca2 += charA / 2;
                    }
                }
            }
        }

        /* ── Sequence letters + complementary strand + amino acids (high zoom) ── */
        if (z > 6 && r > 100) {
            const arcPerBp = (Math.PI * 2) / seqLen;
            const arcPx = r * arcPerBp;
            const fontSize = Math.max(5, Math.min(14, arcPx * 0.55));
            const strandOffset = fontSize * 0.7 + 3;
            const aaFontSize = Math.max(4, Math.min(11, arcPx * 0.4));
            const aaR = r - strandOffset / 2; // AA blocks between complement and backbone

            // Helper: text rotation — at high zoom use consistent direction based on
            // where the viewport center projects onto the circle (no flip discontinuity)
            const uprightAngle = (a: number) => {
                if (z > 8) {
                    // Use viewport center angle as reference for consistent text direction
                    const viewAngle = Math.atan2(size.h / 2 - cy, size.w / 2 - cx);
                    const viewNorm = ((viewAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    const viewFlip = viewNorm > Math.PI / 2 && viewNorm < (3 * Math.PI) / 2;
                    return viewFlip ? a - Math.PI / 2 : a + Math.PI / 2;
                }
                const norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                return (norm > Math.PI / 2 && norm < (3 * Math.PI) / 2)
                    ? a - Math.PI / 2
                    : a + Math.PI / 2;
            };

            for (let i = 0; i < seqLen; i++) {
                const angle = bpToAngle(i);
                const fwdX = cx + Math.cos(angle) * (r + strandOffset);
                const fwdY = cy + Math.sin(angle) * (r + strandOffset);
                if (fwdX < -20 || fwdX > size.w + 20 || fwdY < -20 || fwdY > size.h + 20) continue;

                const char = sequence[i];
                const comp = COMPLEMENT[char] || "N";

                // Forward strand (outside backbone) — always upright
                ctx.save();
                ctx.translate(fwdX, fwdY);
                ctx.rotate(uprightAngle(angle));
                ctx.font = `600 ${fontSize}px JetBrains Mono, Menlo, monospace`;
                ctx.fillStyle = SEQ_COLORS[char] || "#888";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(char, 0, 0);
                ctx.restore();

                // Complement strand (inside backbone) — always upright
                const compX = cx + Math.cos(angle) * (r - strandOffset);
                const compY = cy + Math.sin(angle) * (r - strandOffset);
                ctx.save();
                ctx.translate(compX, compY);
                ctx.rotate(uprightAngle(angle));
                ctx.font = `400 ${fontSize}px JetBrains Mono, Menlo, monospace`;
                ctx.fillStyle = SEQ_COLORS[comp] || "#888";
                ctx.globalAlpha = 0.6;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(comp, 0, 0);
                ctx.restore();
                ctx.globalAlpha = 1;
            }

            // Amino acid translation — codon-spanning arc blocks between complement & backbone
            if (arcPx > 3) {
                const aaBlockH = Math.max(6, strandOffset * 0.55);
                for (let i = 0; i + 2 < seqLen; i += 3) {
                    const codon = sequence.slice(i, i + 3);
                    const aa = CODON_TABLE[codon] || "?";
                    const sa = bpToAngle(i);
                    const ea = bpToAngle(i + 3);
                    const midAngle = (sa + ea) / 2;

                    // Check if midpoint is on screen
                    const mx = cx + Math.cos(midAngle) * aaR;
                    const my = cy + Math.sin(midAngle) * aaR;
                    if (mx < -30 || mx > size.w + 30 || my < -30 || my > size.h + 30) continue;

                    // Draw arc block spanning full codon
                    const isStop = aa === "*";
                    const evenCodon = (Math.floor(i / 3) % 2) === 0;
                    ctx.beginPath();
                    ctx.arc(cx, cy, aaR + aaBlockH / 2, sa, ea);
                    ctx.arc(cx, cy, aaR - aaBlockH / 2, ea, sa, true);
                    ctx.closePath();
                    ctx.fillStyle = isStop
                        ? "rgba(255,60,60,0.5)"
                        : evenCodon ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.18)";
                    ctx.fill();

                    // AA letter centered in the block
                    ctx.save();
                    ctx.translate(mx, my);
                    ctx.rotate(uprightAngle(midAngle));
                    ctx.font = `600 ${aaFontSize}px JetBrains Mono, Menlo, monospace`;
                    ctx.fillStyle = isStop ? "#ff6666" : "#ddd";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(aa, 0, 0);
                    ctx.restore();
                }
            }
        }

        /* ── Center text ── */
        if (z < 3 && cx > -100 && cx < size.w + 100 && cy > -100 && cy < size.h + 100) {
            ctx.font = "600 14px Inter, sans-serif";
            ctx.fillStyle = "#e0e0e8";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${seqLen.toLocaleString()} bp`, cx, cy - 8);
            ctx.font = "400 11px Inter, sans-serif";
            ctx.fillStyle = "#6a6a7a";
            ctx.fillText(topology, cx, cy + 10);
        }

        /* ── Selection tooltip ── */
        if (selectedFeatureId !== null) {
            const selFeat = features.find((f) => f.id === selectedFeatureId);
            if (selFeat) {
                const midAngle = (bpToAngle(selFeat.start) + bpToAngle(selFeat.end)) / 2;
                const tipR = r - 32;
                const tipX = cx + Math.cos(midAngle) * tipR;
                const tipY = cy + Math.sin(midAngle) * tipR;
                if (tipR > 20) {
                    const spanBp = selFeat.end > selFeat.start ? selFeat.end - selFeat.start : seqLen - selFeat.start + selFeat.end;
                    const text = `${spanBp.toLocaleString()} bp`;
                    ctx.font = "600 11px Inter, sans-serif";
                    const tw = ctx.measureText(text).width;
                    const pad = 6;
                    ctx.fillStyle = "rgba(0,0,0,0.75)";
                    roundRect(ctx, tipX - tw / 2 - pad, tipY - 8 - pad / 2, tw + pad * 2, 16 + pad, 4);
                    ctx.fill();
                    ctx.fillStyle = "#fff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(text, tipX, tipY);
                }
            }
        }
    }, [sequence, features, zoom, rotation, size, selectedFeatureId, hoverFeature, selectionRange, bpToAngle, seqLen, topology, getLayout]);

    /* ── SCROLL: always rotate ── */
    /* ── CTRL+SCROLL: zoom ── */
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            // Zoom
            const factor = e.deltaY > 0 ? 1 / 1.08 : 1.08;
            const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
            zoomRef.current = newZ;
            setZoom(newZ);
        } else {
            // Rotate
            const delta = e.deltaY * ROTATE_SPEED;
            rotationRef.current += delta;
            setRotation(rotationRef.current);
        }
    }, []);

    /* ── Drag-select on backbone ── */
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return; // left click only
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { cx, cy, r } = getLayout();
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);

        if (Math.abs(dist - r) < 20) {
            const mouseAngle = Math.atan2(my - cy, mx - cx);
            const bp = angleToBp(mouseAngle);
            dragSelecting.current = true;
            dragStart.current = bp;
            onSelectionRange({ start: bp, end: bp });
        }
    }, [getLayout, angleToBp, onSelectionRange]);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const { cx, cy, r } = getLayout();
            const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
            const mouseAngle = Math.atan2(my - cy, mx - cx);

            if (dragSelecting.current && dragStart.current !== null) {
                const bp = angleToBp(mouseAngle);
                onSelectionRange({ start: dragStart.current, end: bp });
                canvas.style.cursor = "crosshair";
                return;
            }

            const bp = angleToBp(mouseAngle);
            setHoverBp(Math.abs(dist - r) < r * 0.3 ? bp : null);

            // Hit test features — match rendering radius logic
            const z2 = zoomRef.current;
            const hiZ2 = z2 > 6 && r > 100;
            const hiArcPerBp2 = (Math.PI * 2) / seqLen;
            const hiArcPx2 = r * hiArcPerBp2;
            const hiFontSize2 = Math.max(5, Math.min(14, hiArcPx2 * 0.55));
            const hiStrandOff2 = hiFontSize2 * 0.7 + 3;
            const tracks2 = assignTracks(features, seqLen);
            let found: number | null = null;
            for (const { feature, track } of tracks2) {
                const rawThickness = TRACK_THICK[feature.type] || TRACK_DEFAULT;
                const thickness = hiZ2 ? Math.max(14, rawThickness) : rawThickness;
                const gap = 3;
                const featureR = hiZ2
                    ? r + hiStrandOff2 + 22 + track * (thickness + gap)
                    : r - 8 - track * (18 + gap);
                const halfT = thickness / 2 + 3;
                if (Math.abs(dist - featureR) < halfT) {
                    const sa = bpToAngle(feature.start);
                    const ea = bpToAngle(feature.end);
                    let nM = ((mouseAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    let nS = ((sa % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    let nE = ((ea % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    const hit = nS <= nE ? nM >= nS && nM <= nE : nM >= nS || nM <= nE;
                    if (hit) { found = feature.id; break; }
                }
            }
            setHoverFeature(found);
            canvas.style.cursor = found ? "pointer" : Math.abs(dist - r) < 20 ? "crosshair" : "default";
        },
        [features, seqLen, bpToAngle, getLayout, angleToBp, onSelectionRange]
    );

    const handleMouseUp = useCallback(() => {
        if (dragSelecting.current) {
            dragSelecting.current = false;
            if (selectionRange && selectionRange.start === selectionRange.end) {
                onSelectionRange(null);
            }
        }
    }, [selectionRange, onSelectionRange]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (!dragSelecting.current) {
            const multi = e.ctrlKey || e.metaKey;
            onSelectFeature(hoverFeature, multi);
        }
    }, [hoverFeature, onSelectFeature]);

    /* ── Right-click context menu ── */
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { cx, cy, r } = getLayout();
        const mouseAngle = Math.atan2(my - cy, mx - cx);
        const bp = angleToBp(mouseAngle);

        setCtxMenu({
            x: e.clientX,
            y: e.clientY,
            featureId: hoverFeature,
            bp: Math.abs(Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) - r) < r * 0.3 ? bp : null,
        });
    }, [getLayout, angleToBp, hoverFeature]);

    const copyFeatureSeq = (featId: number) => {
        const feat = features.find((f) => f.id === featId);
        if (!feat) return;
        const sub = feat.start < feat.end
            ? sequence.slice(feat.start, feat.end)
            : sequence.slice(feat.start) + sequence.slice(0, feat.end);
        navigator.clipboard.writeText(sub);
        setCtxMenu(null);
    };

    const copyPosition = (bp: number) => {
        navigator.clipboard.writeText(String(bp));
        setCtxMenu(null);
    };

    /* ── Zoom buttons ── */
    const zoomBtn = (factor: number) => {
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
        zoomRef.current = newZ;
        setZoom(newZ);
    };

    const resetView = () => {
        zoomRef.current = 1;
        rotationRef.current = 0;
        setZoom(1);
        setRotation(0);
        onSelectionRange(null);
        onSelectFeature(null);
    };

    /* ── Status bar info ── */
    const hoverChar = hoverBp !== null ? sequence[hoverBp] : null;
    const hoverFeatName = hoverFeature !== null ? features.find((f) => f.id === hoverFeature)?.label || null : null;
    const selSpan = selectionRange ? (selectionRange.end >= selectionRange.start
        ? selectionRange.end - selectionRange.start
        : seqLen - selectionRange.start + selectionRange.end) : 0;

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
                onContextMenu={handleContextMenu}
                style={{ cursor: "default" }}
            />
            <div className="zoom-controls">
                <button onClick={() => zoomBtn(1.4)}>+</button>
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <button onClick={() => zoomBtn(1 / 1.4)}>−</button>
                <button onClick={resetView} title="Reset">⟲</button>
            </div>
            <div className="status-bar">
                {selectionRange && selSpan > 0 ? (
                    <span>Selected: {selectionRange.start.toLocaleString()}–{selectionRange.end.toLocaleString()} ({selSpan.toLocaleString()} bp)</span>
                ) : hoverBp !== null ? (
                    <>
                        <span>Base {hoverBp.toLocaleString()}</span>
                        {hoverChar && <span className={`status-nt nt-${hoverChar}`}>{hoverChar}</span>}
                        {hoverFeatName && <span className="status-feat">· {hoverFeatName}</span>}
                    </>
                ) : (
                    <span>Scroll to rotate · Ctrl+scroll to zoom</span>
                )}
            </div>

            {/* Context Menu */}
            {ctxMenu && (
                <div className="ctx-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
                    {ctxMenu.featureId !== null ? (
                        <>
                            <button className="ctx-item" onClick={() => copyFeatureSeq(ctxMenu.featureId!)}>
                                Copy Feature Sequence
                            </button>
                            <button className="ctx-item" onClick={() => { onSelectFeature(ctxMenu.featureId); setCtxMenu(null); }}>
                                Select Feature
                            </button>
                            <div className="ctx-divider" />
                            {onDeleteFeature && (
                                <button className="ctx-item ctx-danger" onClick={() => { onSelectFeature(ctxMenu.featureId!); onDeleteFeature(); setCtxMenu(null); }}>
                                    Delete Feature
                                </button>
                            )}
                        </>
                    ) : ctxMenu.bp !== null ? (
                        <>
                            {selectionRange && (
                                <>
                                    <button className="ctx-item" onClick={() => {
                                        const { start, end } = selectionRange;
                                        const sub = start < end ? sequence.slice(start, end) : sequence.slice(start) + sequence.slice(0, end);
                                        const len = start < end ? end - start : seqLen - start + end;
                                        navigator.clipboard.writeText(sub);
                                        setCtxMenu(null);
                                    }}>
                                        Copy Selection ({(() => { const { start, end } = selectionRange; return start < end ? end - start : seqLen - start + end; })().toLocaleString()} bp)
                                    </button>
                                    <div className="ctx-divider" />
                                </>
                            )}
                            <button className="ctx-item" onClick={() => copyPosition(ctxMenu.bp!)}>
                                Copy Position ({ctxMenu.bp!.toLocaleString()} bp)
                            </button>
                            <button className="ctx-item" onClick={() => {
                                const sub = sequence.slice(Math.max(0, ctxMenu.bp! - 50), Math.min(seqLen, ctxMenu.bp! + 50));
                                navigator.clipboard.writeText(sub);
                                setCtxMenu(null);
                            }}>
                                Copy ±50bp Region
                            </button>
                        </>
                    ) : (
                        <button className="ctx-item" onClick={() => setCtxMenu(null)}>No actions</button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function getTickInterval(seqLen: number, zoom: number): number {
    const visibleBp = seqLen / zoom;
    if (visibleBp < 200) return 10;
    if (visibleBp < 500) return 25;
    if (visibleBp < 2000) return 100;
    if (visibleBp < 5000) return 250;
    if (visibleBp < 15000) return 500;
    if (visibleBp < 50000) return 1000;
    return 5000;
}

function formatBp(bp: number): string {
    if (bp >= 1000) return (bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1) + "k";
    return bp.toString();
}

function assignTracks(features: Feature[], _seqLen: number) {
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
}
