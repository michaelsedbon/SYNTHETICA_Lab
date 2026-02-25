"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { SequenceSummary, uploadFile } from "@/lib/api";
import { FileText, Upload, Plus, FolderPlus, ChevronRight } from "lucide-react";

/* ── Types ── */

interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    sequenceIds: number[];
    open: boolean;
}

interface Props {
    sequences: SequenceSummary[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onDelete: (id: number) => void;
    onRename: (id: number, name: string) => void;
    onDuplicate: (id: number) => void;
    onUploadComplete: (id: number) => void;
}

const STORAGE_KEY = "plasmid-viewer-folders";

function loadFolders(): Folder[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveFolders(folders: Folder[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

/* ── Component ── */

export default function ProjectTree({
    sequences, activeId, onSelect, onDelete, onRename, onDuplicate, onUploadComplete,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Context menu
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: "seq" | "folder"; id: number | string } | null>(null);
    const [renaming, setRenaming] = useState<{ id: number | string; type: "seq" | "folder" } | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const renameInputRef = useRef<HTMLInputElement>(null);

    // Folders
    const [folders, setFolders] = useState<Folder[]>(loadFolders);

    useEffect(() => { saveFolders(folders); }, [folders]);

    // Close context menu on click outside
    useEffect(() => {
        const handler = () => setCtxMenu(null);
        window.addEventListener("click", handler);
        return () => window.removeEventListener("click", handler);
    }, []);

    // Focus rename input
    useEffect(() => {
        if (renaming) renameInputRef.current?.focus();
    }, [renaming]);

    const handleFile = useCallback(async (file: File) => {
        setUploading(true);
        try { const r = await uploadFile(file); onUploadComplete(r.id); }
        catch (e) { alert("Upload failed: " + (e as Error).message); }
        finally { setUploading(false); }
    }, [onUploadComplete]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    /* ── Context menu handlers ── */
    const handleCtx = (e: React.MouseEvent, type: "seq" | "folder", id: number | string) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY, type, id });
    };

    const startRename = (type: "seq" | "folder", id: number | string, currentName: string) => {
        setCtxMenu(null);
        setRenaming({ id, type });
        setRenameValue(currentName);
    };

    const commitRename = () => {
        if (!renaming || !renameValue.trim()) { setRenaming(null); return; }
        if (renaming.type === "seq") {
            onRename(renaming.id as number, renameValue.trim());
        } else {
            setFolders((prev) => prev.map((f) => f.id === renaming.id ? { ...f, name: renameValue.trim() } : f));
        }
        setRenaming(null);
    };

    const handleCopySeq = async (id: number) => {
        setCtxMenu(null);
        const seq = sequences.find((s) => s.id === id);
        if (seq) await navigator.clipboard.writeText(seq.name);
    };

    /* ── Folder operations ── */
    const createFolder = (parentId: string | null = null) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        setFolders((prev) => [...prev, { id, name: "New Folder", parentId, sequenceIds: [], open: true }]);
        setCtxMenu(null);
        setTimeout(() => startRename("folder", id, "New Folder"), 50);
    };

    const deleteFolder = (folderId: string) => {
        setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parentId !== folderId));
        setCtxMenu(null);
    };

    const toggleFolder = (folderId: string) => {
        setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, open: !f.open } : f));
    };

    // Sequences in any folder
    const assignedIds = new Set(folders.flatMap((f) => f.sequenceIds));
    const unassigned = sequences.filter((s) => !assignedIds.has(s.id));

    // Drag sequence into folder
    const handleSeqDragStart = (e: React.DragEvent, seqId: number) => {
        e.dataTransfer.setData("text/plain", String(seqId));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
        e.preventDefault(); e.stopPropagation();
        const seqIdStr = e.dataTransfer.getData("text/plain");
        const seqId = parseInt(seqIdStr, 10);
        if (isNaN(seqId)) return;
        setFolders((prev) => {
            // Remove from other folders first
            let updated = prev.map((f) => ({ ...f, sequenceIds: f.sequenceIds.filter((id) => id !== seqId) }));
            // Add to target
            return updated.map((f) => f.id === folderId ? { ...f, sequenceIds: [...f.sequenceIds, seqId] } : f);
        });
    };

    /* ── Render a sequence item ── */
    const renderSeq = (seq: SequenceSummary, indent = 0) => {
        const isRenaming = renaming?.type === "seq" && renaming.id === seq.id;
        return (
            <div
                key={seq.id}
                className={`tree-item ${seq.id === activeId ? "active" : ""}`}
                style={{ paddingLeft: 10 + indent * 16 }}
                onClick={() => onSelect(seq.id)}
                onContextMenu={(e) => handleCtx(e, "seq", seq.id)}
                draggable
                onDragStart={(e) => handleSeqDragStart(e, seq.id)}
            >
                <FileText className="tree-icon" size={16} />
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        className="tree-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }}
                    />
                ) : (
                    <span className="tree-name">{seq.name}</span>
                )}
                <span className="tree-meta">{formatLen(seq.length)}</span>
            </div>
        );
    };

    /* ── Render a folder ── */
    const renderFolder = (folder: Folder, depth = 0) => {
        const subFolders = folders.filter((f) => f.parentId === folder.id);
        const seqs = sequences.filter((s) => folder.sequenceIds.includes(s.id));
        const isRenaming = renaming?.type === "folder" && renaming.id === folder.id;

        return (
            <div key={folder.id}>
                <div
                    className="tree-item tree-folder"
                    style={{ paddingLeft: 10 + depth * 16 }}
                    onClick={() => toggleFolder(folder.id)}
                    onContextMenu={(e) => handleCtx(e, "folder", folder.id)}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
                >
                    <ChevronRight size={14} className={`tree-chevron ${folder.open ? "open" : ""}`} />
                    {isRenaming ? (
                        <input
                            ref={renameInputRef}
                            className="tree-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="tree-name">{folder.name}</span>
                    )}
                    <span className="tree-meta">{seqs.length}</span>
                </div>
                {folder.open && (
                    <>
                        {subFolders.map((sf) => renderFolder(sf, depth + 1))}
                        {seqs.map((s) => renderSeq(s, depth + 1))}
                    </>
                )}
            </div>
        );
    };

    const rootFolders = folders.filter((f) => f.parentId === null);

    return (
        <div
            className="panel-left"
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
        >
            <div className="panel-header">
                <h2>Sequences</h2>
                <div style={{ display: "flex", gap: 2 }}>
                    <button className="btn-icon" onClick={() => createFolder(null)} title="New folder">
                        <FolderPlus size={15} />
                    </button>
                    <button className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Import GenBank file">
                        <Plus size={16} />
                    </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".gb,.gbk,.genbank,.seq" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>

            <div className="panel-content">
                {uploading && (
                    <div style={{ padding: "12px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)", fontSize: 12 }}>
                        <span className="spinner" /> Importing...
                    </div>
                )}

                {sequences.length === 0 && !uploading ? (
                    <div className={`upload-zone ${dragOver ? "drag-over" : ""}`} onClick={() => fileInputRef.current?.click()}>
                        <Upload className="upload-icon" />
                        <div className="upload-text">Drop a GenBank file here</div>
                        <div className="upload-hint">or click to browse (.gb, .gbk)</div>
                    </div>
                ) : (
                    <>
                        {rootFolders.map((f) => renderFolder(f))}
                        {unassigned.map((s) => renderSeq(s))}
                        {dragOver && (
                            <div className="upload-zone drag-over" style={{ margin: 8 }}>
                                <div className="upload-text">Drop to import</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Context Menu ── */}
            {ctxMenu && (
                <div className="ctx-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
                    {ctxMenu.type === "seq" ? (
                        <>
                            <button className="ctx-item" onClick={() => {
                                const seq = sequences.find((s) => s.id === ctxMenu.id);
                                if (seq) startRename("seq", seq.id, seq.name);
                            }}>Rename</button>
                            <button className="ctx-item" onClick={() => { onDuplicate(ctxMenu.id as number); setCtxMenu(null); }}>Duplicate</button>
                            <button className="ctx-item" onClick={() => handleCopySeq(ctxMenu.id as number)}>Copy Name</button>
                            <div className="ctx-divider" />
                            <button className="ctx-item ctx-danger" onClick={() => { onDelete(ctxMenu.id as number); setCtxMenu(null); }}>Delete</button>
                        </>
                    ) : (
                        <>
                            <button className="ctx-item" onClick={() => {
                                const f = folders.find((fo) => fo.id === ctxMenu.id);
                                if (f) startRename("folder", f.id, f.name);
                            }}>Rename</button>
                            <button className="ctx-item" onClick={() => createFolder(ctxMenu.id as string)}>New Subfolder</button>
                            <div className="ctx-divider" />
                            <button className="ctx-item ctx-danger" onClick={() => deleteFolder(ctxMenu.id as string)}>Delete Folder</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function formatLen(bp: number): string {
    if (bp >= 1000) return (bp / 1000).toFixed(1) + " kb";
    return bp + " bp";
}
