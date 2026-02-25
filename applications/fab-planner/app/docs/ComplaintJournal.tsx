"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ──────────────────────────────────────────────── */
interface Attachment {
    id: string;
    complaintId: string;
    fileName: string;
    filePath: string;
    fileType: string;
    createdAt: string;
}

interface Complaint {
    id: string;
    text: string;
    author: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    attachments: Attachment[];
}

type Status = "open" | "in-progress" | "resolved" | "abandoned";

const STATUS_META: Record<Status, { label: string; color: string; icon: string }> = {
    open: { label: "Open", color: "#f85149", icon: "🔴" },
    "in-progress": { label: "In Progress", color: "#d29922", icon: "🟡" },
    resolved: { label: "Resolved", color: "#3fb950", icon: "🟢" },
    abandoned: { label: "Abandoned", color: "#8b949e", icon: "⚫" },
};

/* ─── Main Component ─────────────────────────────────────── */
export default function ComplaintJournal() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [author, setAuthor] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Persist author name in localStorage
    useEffect(() => {
        const saved = localStorage.getItem("cj-author");
        if (saved) setAuthor(saved);
    }, []);

    const handleAuthorChange = (val: string) => {
        setAuthor(val);
        localStorage.setItem("cj-author", val);
    };

    /* ── Fetch ──────────────────────────────────────────── */
    const fetchComplaints = useCallback(async () => {
        try {
            const res = await fetch("/api/complaints");
            if (res.ok) setComplaints(await res.json());
        } catch (err) {
            console.error("Failed to fetch complaints:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

    /* ── Submit ─────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (!text.trim() && files.length === 0) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("text", text.trim() || "(attachment only)");
            fd.append("author", author.trim());
            for (const f of files) fd.append("files", f);

            const res = await fetch("/api/complaints", { method: "POST", body: fd });
            if (res.ok) {
                setText("");
                setFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
                await fetchComplaints();
            }
        } catch (err) {
            console.error("Failed to submit complaint:", err);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Update status ─────────────────────────────────── */
    const updateStatus = async (id: string, status: Status) => {
        try {
            const res = await fetch(`/api/complaints/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.ok) await fetchComplaints();
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    /* ── Edit text ─────────────────────────────────────── */
    const startEdit = (c: Complaint) => {
        setEditingId(c.id);
        setEditText(c.text);
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            const res = await fetch(`/api/complaints/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: editText }),
            });
            if (res.ok) {
                setEditingId(null);
                await fetchComplaints();
            }
        } catch (err) {
            console.error("Failed to edit complaint:", err);
        }
    };

    /* ── Delete ─────────────────────────────────────────── */
    const handleDelete = async (id: string) => {
        if (!confirm("Delete this entry? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/complaints/${id}`, { method: "DELETE" });
            if (res.ok) await fetchComplaints();
        } catch (err) {
            console.error("Failed to delete complaint:", err);
        }
    };

    /* ── File helpers ──────────────────────────────────── */
    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dropped = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...dropped]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Escape: clear files first, then blur textarea
        if (e.key === "Escape") {
            e.stopPropagation();
            if (files.length > 0) {
                setFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
            } else {
                textareaRef.current?.blur();
            }
        }
        // Cmd+Enter to submit
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const attachmentUrl = (a: Attachment) =>
        `/api/complaints/files/${a.complaintId}/${a.fileName}`;

    /* ── Render ─────────────────────────────────────────── */
    return (
        <div className="cj-container">
            {/* Compose box */}
            <div
                className="cj-compose"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                <h4>✏️ Report an Issue</h4>
                <input
                    type="text"
                    className="cj-name-input"
                    placeholder="Your name"
                    value={author}
                    onChange={(e) => handleAuthorChange(e.target.value)}
                />
                <textarea
                    ref={textareaRef}
                    className="cj-textarea"
                    placeholder="Describe the problem you encountered…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                />

                {/* File previews */}
                {files.length > 0 && (
                    <div className="cj-file-previews">
                        <div className="cj-file-previews-header">
                            <span style={{ fontSize: 12, color: "var(--docs-text-secondary)" }}>
                                {files.length} file{files.length !== 1 ? "s" : ""} attached
                            </span>
                            <button
                                className="cj-btn cj-btn-cancel"
                                onClick={() => { setFiles([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                title="Remove all attachments (Esc)"
                                style={{ fontSize: 11, padding: "2px 8px" }}
                            >
                                ← Clear All
                            </button>
                        </div>
                        {files.map((f, i) => (
                            <div key={i} className="cj-file-chip">
                                <span className="cj-file-chip-name">
                                    {f.type.startsWith("image/") ? "🖼️" : f.type.startsWith("video/") ? "🎬" : "📎"}{" "}
                                    {f.name}
                                </span>
                                <button className="cj-file-chip-remove" onClick={() => removeFile(i)}>
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="cj-compose-actions">
                    <button
                        className="cj-btn cj-btn-attach"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        📎 Attach Files
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }}
                    />
                    <span className="cj-hint">⌘+Enter to submit</span>
                    <button
                        className="cj-btn cj-btn-submit"
                        disabled={submitting || (!text.trim() && files.length === 0)}
                        onClick={handleSubmit}
                    >
                        {submitting ? "Posting…" : "Post Issue"}
                    </button>
                </div>
            </div>

            {/* Entry feed */}
            <div className="cj-feed">
                {loading && <p className="cj-empty">Loading entries…</p>}
                {!loading && complaints.length === 0 && (
                    <p className="cj-empty">No issues reported yet. Use the form above to report one.</p>
                )}
                {complaints.map((c) => {
                    const meta = STATUS_META[c.status as Status] || STATUS_META.open;
                    const isEditing = editingId === c.id;

                    return (
                        <div key={c.id} className={`cj-entry cj-entry--${c.status}`}>
                            <div className="cj-entry-header">
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {c.author && <span className="cj-entry-author">{c.author}</span>}
                                    <span className="cj-entry-date">{formatDate(c.createdAt)}</span>
                                </div>
                                <span
                                    className="cj-status-badge"
                                    style={{ background: meta.color + "22", color: meta.color, borderColor: meta.color + "44" }}
                                >
                                    {meta.icon} {meta.label}
                                </span>
                            </div>

                            {/* Body */}
                            {isEditing ? (
                                <div className="cj-edit-box">
                                    <textarea
                                        className="cj-textarea"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        rows={3}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") { e.stopPropagation(); setEditingId(null); }
                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
                                        }}
                                        autoFocus
                                    />
                                    <div className="cj-edit-actions">
                                        <button className="cj-btn cj-btn-save" onClick={saveEdit}>Save</button>
                                        <button className="cj-btn cj-btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="cj-entry-text">{c.text}</p>
                            )}

                            {/* Attachments */}
                            {c.attachments.length > 0 && (
                                <div className="cj-attachments">
                                    {c.attachments.map((a) => (
                                        <a key={a.id} href={attachmentUrl(a)} target="_blank" rel="noopener noreferrer" className="cj-attachment">
                                            {a.fileType.startsWith("image/") ? (
                                                <img src={attachmentUrl(a)} alt={a.fileName} className="cj-attachment-img" />
                                            ) : a.fileType.startsWith("video/") ? (
                                                <video src={attachmentUrl(a)} className="cj-attachment-video" controls preload="metadata" />
                                            ) : (
                                                <span className="cj-attachment-file">📎 {a.fileName}</span>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            {!isEditing && (
                                <div className="cj-entry-actions">
                                    <button className="cj-action-btn" onClick={() => startEdit(c)} title="Edit">✏️</button>
                                    <button className="cj-action-btn cj-action-btn--danger" onClick={() => handleDelete(c.id)} title="Delete">🗑️</button>
                                    <span className="cj-action-separator" />
                                    {(["open", "in-progress", "resolved", "abandoned"] as Status[])
                                        .filter((s) => s !== c.status)
                                        .map((s) => (
                                            <button
                                                key={s}
                                                className="cj-action-btn cj-status-action"
                                                onClick={() => updateStatus(c.id, s)}
                                                title={`Mark as ${STATUS_META[s].label}`}
                                            >
                                                {STATUS_META[s].icon} {STATUS_META[s].label}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
