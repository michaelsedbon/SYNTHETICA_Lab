"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    Feature,
    Orf,
    SequenceDetail,
    detectOrfs,
    commitOrfs,
    updateFeature,
    deleteFeature,
} from "@/lib/api";
import { ChevronRight, Dna, Search, Pencil, Trash2, Crosshair, Info } from "lucide-react";

const FEATURE_TYPES = [
    "CDS", "gene", "promoter", "terminator", "RBS", "rep_origin",
    "primer_bind", "misc_feature", "regulatory", "sig_peptide",
    "misc_binding", "protein_bind", "5'UTR", "3'UTR", "enhancer",
    "polyA_signal", "LTR", "misc_recomb",
];

interface Props {
    sequence: SequenceDetail | null;
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
    onDataChange: () => void;
    onOrfPreview?: (orfs: Orf[]) => void;
}

export default function OperationsPanel({
    sequence,
    selectedFeatureId,
    onSelectFeature,
    onDataChange,
    onOrfPreview,
}: Props) {
    const [infoOpen, setInfoOpen] = useState(true);
    const [orfOpen, setOrfOpen] = useState(true);
    const [editOpen, setEditOpen] = useState(true);

    // ORF state
    const [orfMinLength, setOrfMinLength] = useState(300);
    const [orfStartATG, setOrfStartATG] = useState(true);
    const [orfStartGTG, setOrfStartGTG] = useState(false);
    const [orfStartTTG, setOrfStartTTG] = useState(false);
    const [orfIncludeReverse, setOrfIncludeReverse] = useState(true);
    const [orfResults, setOrfResults] = useState<(Orf & { selected: boolean })[]>([]);
    const [orfLoading, setOrfLoading] = useState(false);

    // Annotation edit state
    const selectedFeature = sequence?.features.find((f) => f.id === selectedFeatureId) || null;
    const [editLabel, setEditLabel] = useState("");
    const [editType, setEditType] = useState("CDS");
    const [editColor, setEditColor] = useState("#4A90D9");
    const [editStrand, setEditStrand] = useState(1);
    const [editStart, setEditStart] = useState(0);
    const [editEnd, setEditEnd] = useState(0);

    useEffect(() => {
        if (selectedFeature) {
            setEditLabel(selectedFeature.label);
            setEditType(selectedFeature.type);
            setEditColor(selectedFeature.color);
            setEditStrand(selectedFeature.strand);
            setEditStart(selectedFeature.start);
            setEditEnd(selectedFeature.end);
        }
    }, [selectedFeatureId, selectedFeature?.id]);

    // Send ORF preview to parent
    useEffect(() => {
        if (onOrfPreview) {
            onOrfPreview(orfResults.filter((o) => o.selected));
        }
    }, [orfResults, onOrfPreview]);

    const handleDetectOrfs = useCallback(async () => {
        if (!sequence) return;
        setOrfLoading(true);
        try {
            const startCodons: string[] = [];
            if (orfStartATG) startCodons.push("ATG");
            if (orfStartGTG) startCodons.push("GTG");
            if (orfStartTTG) startCodons.push("TTG");
            if (startCodons.length === 0) startCodons.push("ATG");
            const result = await detectOrfs(sequence.id, {
                min_length: orfMinLength,
                start_codons: startCodons,
                include_reverse: orfIncludeReverse,
            });
            setOrfResults(result.orfs.map((o) => ({ ...o, selected: true })));
        } catch (e) {
            console.error("ORF detection failed:", e);
        } finally {
            setOrfLoading(false);
        }
    }, [sequence, orfMinLength, orfStartATG, orfStartGTG, orfStartTTG, orfIncludeReverse]);

    const handleCommitOrfs = useCallback(async () => {
        if (!sequence) return;
        const selected = orfResults.filter((o) => o.selected);
        if (selected.length === 0) return;
        await commitOrfs(sequence.id, selected);
        setOrfResults([]);
        onDataChange();
    }, [sequence, orfResults, onDataChange]);

    const handleSaveFeature = useCallback(async () => {
        if (!sequence || !selectedFeature) return;
        await updateFeature(sequence.id, selectedFeature.id, {
            label: editLabel,
            type: editType,
            color: editColor,
            strand: editStrand,
            start: editStart,
            end: editEnd,
        });
        onDataChange();
    }, [sequence, selectedFeature, editLabel, editType, editColor, editStrand, editStart, editEnd, onDataChange]);

    const handleDeleteFeature = useCallback(async () => {
        if (!sequence || !selectedFeature) return;
        await deleteFeature(sequence.id, selectedFeature.id);
        onSelectFeature(null);
        onDataChange();
    }, [sequence, selectedFeature, onSelectFeature, onDataChange]);

    // Compute feature info
    const featLen = selectedFeature
        ? (selectedFeature.end > selectedFeature.start
            ? selectedFeature.end - selectedFeature.start
            : (sequence?.length || 0) - selectedFeature.start + selectedFeature.end)
        : 0;

    const featSeq = selectedFeature && sequence
        ? (selectedFeature.start < selectedFeature.end
            ? sequence.sequence.slice(selectedFeature.start, selectedFeature.end)
            : sequence.sequence.slice(selectedFeature.start) + sequence.sequence.slice(0, selectedFeature.end))
        : "";

    const gcContent = featSeq.length > 0
        ? ((featSeq.split("").filter((c) => c === "G" || c === "C").length / featSeq.length) * 100).toFixed(1)
        : "0";

    if (!sequence) {
        return (
            <div className="panel-right">
                <div className="panel-header"><h2>Operations</h2></div>
                <div className="empty-state">
                    <Dna className="empty-icon" />
                    <span className="empty-text">No sequence loaded</span>
                </div>
            </div>
        );
    }

    return (
        <div className="panel-right">
            <div className="panel-header"><h2>Operations</h2></div>
            <div className="panel-content" style={{ overflowY: "auto" }}>

                {/* ── Selected Annotation Info ── */}
                {selectedFeature && (
                    <div className="section">
                        <div className="section-header" onClick={() => setInfoOpen(!infoOpen)}>
                            <ChevronRight className={`chevron ${infoOpen ? "open" : ""}`} />
                            <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: selectedFeature.color, flexShrink: 0 }} />
                                {selectedFeature.label || "Untitled"}
                            </h3>
                        </div>
                        {infoOpen && (
                            <div className="section-body">
                                <div className="info-row">
                                    <span className="info-label">Type</span>
                                    <span className="info-value">
                                        <span className="badge badge-blue">{selectedFeature.type}</span>
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Position</span>
                                    <span className="info-value" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                                        {selectedFeature.start.toLocaleString()}..{selectedFeature.end.toLocaleString()}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Length</span>
                                    <span className="info-value">{featLen.toLocaleString()} bp</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Strand</span>
                                    <span className="info-value">{selectedFeature.strand === 1 ? "Forward (+)" : "Reverse (−)"}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">GC Content</span>
                                    <span className="info-value">{gcContent}%</span>
                                </div>
                                {selectedFeature.type === "CDS" && (
                                    <div className="info-row">
                                        <span className="info-label">Amino acids</span>
                                        <span className="info-value">{Math.floor(featLen / 3)} aa</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Sequence Info ── */}
                {!selectedFeature && (
                    <div className="section">
                        <div className="section-header" onClick={() => setInfoOpen(!infoOpen)}>
                            <ChevronRight className={`chevron ${infoOpen ? "open" : ""}`} />
                            <h3>Sequence Info</h3>
                        </div>
                        {infoOpen && (
                            <div className="section-body">
                                <div className="info-row">
                                    <span className="info-label">Name</span>
                                    <span className="info-value">{sequence.name}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Length</span>
                                    <span className="info-value">{sequence.length.toLocaleString()} bp</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Topology</span>
                                    <span className="info-value">
                                        <span className={`badge ${sequence.topology === "circular" ? "badge-blue" : "badge-green"}`}>
                                            {sequence.topology}
                                        </span>
                                    </span>
                                </div>
                                {sequence.organism && (
                                    <div className="info-row">
                                        <span className="info-label">Organism</span>
                                        <span className="info-value">{sequence.organism}</span>
                                    </div>
                                )}
                                <div className="info-row">
                                    <span className="info-label">Features</span>
                                    <span className="info-value">{sequence.features.length}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Detect ORFs ── */}
                <div className="section">
                    <div className="section-header" onClick={() => setOrfOpen(!orfOpen)}>
                        <ChevronRight className={`chevron ${orfOpen ? "open" : ""}`} />
                        <h3>Detect ORFs</h3>
                    </div>
                    {orfOpen && (
                        <div className="section-body">
                            <div className="form-group">
                                <label className="form-label">Minimum Length (bp)</label>
                                <div className="slider-row">
                                    <input
                                        type="range" min={90} max={3000} step={30}
                                        value={orfMinLength}
                                        onChange={(e) => setOrfMinLength(Number(e.target.value))}
                                    />
                                    <span className="slider-value">{orfMinLength} bp</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Start Codons</label>
                                <div className="checkbox-group">
                                    <label className="checkbox-item">
                                        <input type="checkbox" checked={orfStartATG} onChange={(e) => setOrfStartATG(e.target.checked)} /> ATG
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" checked={orfStartGTG} onChange={(e) => setOrfStartGTG(e.target.checked)} /> GTG
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" checked={orfStartTTG} onChange={(e) => setOrfStartTTG(e.target.checked)} /> TTG
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="checkbox-item">
                                    <input type="checkbox" checked={orfIncludeReverse}
                                        onChange={(e) => setOrfIncludeReverse(e.target.checked)} />
                                    Include reverse complement
                                </label>
                            </div>

                            <button className="btn btn-primary" onClick={handleDetectOrfs} disabled={orfLoading}
                                style={{ width: "100%", marginBottom: 8 }}>
                                {orfLoading ? (<><span className="spinner" /> Detecting...</>) : (<><Search size={14} /> Find ORFs</>)}
                            </button>

                            {orfResults.length > 0 && (
                                <>
                                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>
                                        Found {orfResults.length} ORF{orfResults.length !== 1 ? "s" : ""} · Preview shown on map
                                    </div>
                                    <div className="orf-list">
                                        {orfResults.map((orf, i) => (
                                            <div key={i} className="orf-item">
                                                <input type="checkbox" className="orf-checkbox" checked={orf.selected}
                                                    onChange={() => {
                                                        const copy = [...orfResults];
                                                        copy[i] = { ...copy[i], selected: !copy[i].selected };
                                                        setOrfResults(copy);
                                                    }} />
                                                <div className="orf-swatch" style={{ background: orf.color }} />
                                                <div className="orf-info">Frame {orf.frame + 1}{orf.strand === -1 ? "r" : "f"} · {orf.start}–{orf.end}</div>
                                                <div className="orf-len">{orf.length} bp</div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={handleCommitOrfs} style={{ width: "100%", marginTop: 8 }}>
                                        <Crosshair size={12} /> Apply {orfResults.filter((o) => o.selected).length} as annotations
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Annotation Editor ── */}
                {selectedFeature && (
                    <div className="section">
                        <div className="section-header" onClick={() => setEditOpen(!editOpen)}>
                            <ChevronRight className={`chevron ${editOpen ? "open" : ""}`} />
                            <h3>Edit Annotation</h3>
                        </div>
                        {editOpen && (
                            <div className="section-body">
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input className="form-input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                                        {FEATURE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Color</label>
                                    <div className="color-picker-row">
                                        <div className="color-swatch" style={{ background: editColor }}>
                                            <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                                        </div>
                                        <input className="form-input" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                                            style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11 }} />
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                    <div className="form-group">
                                        <label className="form-label">Start</label>
                                        <input className="form-input" type="number" value={editStart}
                                            onChange={(e) => setEditStart(Number(e.target.value))} style={{ fontFamily: "var(--font-mono)" }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End</label>
                                        <input className="form-input" type="number" value={editEnd}
                                            onChange={(e) => setEditEnd(Number(e.target.value))} style={{ fontFamily: "var(--font-mono)" }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Strand</label>
                                    <select className="form-select" value={editStrand} onChange={(e) => setEditStrand(Number(e.target.value))}>
                                        <option value={1}>Forward (+)</option>
                                        <option value={-1}>Reverse (−)</option>
                                    </select>
                                </div>
                                <div className="btn-group" style={{ marginTop: 16 }}>
                                    <button className="btn btn-primary" onClick={handleSaveFeature}><Pencil size={12} /> Save</button>
                                    <button className="btn btn-danger" onClick={handleDeleteFeature}><Trash2 size={12} /> Delete</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
