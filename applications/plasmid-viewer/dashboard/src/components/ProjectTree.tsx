"use client";

import React, { useCallback, useRef, useState } from "react";
import { SequenceSummary, Feature, uploadFile } from "@/lib/api";
import { FileText, Trash2, Upload, Plus } from "lucide-react";

interface Props {
    sequences: SequenceSummary[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onDelete: (id: number) => void;
    onUploadComplete: (id: number) => void;
    features: Feature[];
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
}

export default function ProjectTree({
    sequences,
    activeId,
    onSelect,
    onDelete,
    onUploadComplete,
    features,
    selectedFeatureId,
    onSelectFeature,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFile = useCallback(async (file: File) => {
        setUploading(true);
        try {
            const result = await uploadFile(file);
            onUploadComplete(result.id);
        } catch (e) {
            console.error("Upload failed:", e);
            alert("Upload failed: " + (e as Error).message);
        } finally {
            setUploading(false);
        }
    }, [onUploadComplete]);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => setDragOver(false), []);

    return (
        <div
            className="panel-left"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <div className="panel-header">
                <h2>Sequences</h2>
                <button
                    className="btn-icon"
                    onClick={() => fileInputRef.current?.click()}
                    title="Import GenBank file"
                >
                    <Plus size={16} />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gb,.gbk,.genbank,.seq"
                    style={{ display: "none" }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = "";
                    }}
                />
            </div>

            <div className="panel-content">
                {uploading && (
                    <div style={{ padding: "12px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)", fontSize: 12 }}>
                        <span className="spinner" /> Importing...
                    </div>
                )}

                {sequences.length === 0 && !uploading ? (
                    <div
                        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="upload-icon" />
                        <div className="upload-text">Drop a GenBank file here</div>
                        <div className="upload-hint">or click to browse (.gb, .gbk)</div>
                    </div>
                ) : (
                    <>
                        {/* Sequence list */}
                        {sequences.map((seq) => (
                            <React.Fragment key={seq.id}>
                                <div
                                    className={`tree-item ${seq.id === activeId ? "active" : ""}`}
                                    onClick={() => onSelect(seq.id)}
                                >
                                    <FileText className="tree-icon" size={16} />
                                    <span className="tree-name">{seq.name}</span>
                                    <span className="tree-meta">{formatLen(seq.length)}</span>
                                    <button
                                        className="btn-icon"
                                        style={{ marginLeft: 2 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete "${seq.name}"?`)) onDelete(seq.id);
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {/* Feature sub-items when this sequence is active */}
                                {seq.id === activeId && features.length > 0 && (
                                    <div style={{ paddingLeft: 20, marginBottom: 4 }}>
                                        {features.map((feat) => (
                                            <div
                                                key={feat.id}
                                                className={`feature-list-item ${feat.id === selectedFeatureId ? "selected" : ""}`}
                                                onClick={() => onSelectFeature(feat.id)}
                                            >
                                                <span className="feat-swatch" style={{ background: feat.color }} />
                                                <span className="feat-label">{feat.label || feat.type}</span>
                                                <span className="feat-type">{feat.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}

                        {/* Upload zone at bottom when we already have sequences */}
                        {dragOver && (
                            <div className="upload-zone drag-over" style={{ margin: 8 }}>
                                <div className="upload-text">Drop to import</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function formatLen(bp: number): string {
    if (bp >= 1000) return (bp / 1000).toFixed(1) + " kb";
    return bp + " bp";
}
