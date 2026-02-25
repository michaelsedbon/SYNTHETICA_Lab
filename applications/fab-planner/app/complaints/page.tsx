"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ComplaintJournal from "@/app/docs/ComplaintJournal";
import "@/app/docs/docs.css";

export default function ComplaintsPage() {
    const router = useRouter();

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                router.push("/");
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [router]);

    return (
        <div className="docs-layout">
            <nav className="docs-sidebar" style={{ width: 220, minWidth: 220 }}>
                <div className="docs-sidebar-header">
                    <h1>📝 Complaints</h1>
                    <span className="docs-version">Issue Tracker</span>
                </div>
                <div style={{ flex: 1, padding: "16px 20px" }}>
                    <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--docs-text-secondary)", margin: 0 }}>
                        Report issues, bugs, or suggestions about the app.
                        Attach screenshots or recordings to help explain.
                    </p>
                    <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--docs-accent-soft)", borderRadius: 8, fontSize: 11, color: "var(--docs-text-secondary)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--docs-accent)" }}>💡 Tip:</strong> Drag &amp; drop images directly onto the compose box, or use <kbd style={{ fontSize: 10, padding: "1px 4px", background: "var(--docs-code-bg)", border: "1px solid var(--docs-border)", borderRadius: 3 }}>⌘+Enter</kbd> to submit quickly.
                    </div>
                </div>
                <div className="docs-sidebar-footer">
                    <a href="/" className="back-link">← Back to App</a>
                </div>
            </nav>
            <main className="docs-content">
                <div className="docs-content-inner">
                    <h2>📝 Complaint Journal</h2>
                    <p>
                        Track issues through their lifecycle: <strong>open → in progress → resolved</strong>.
                        Each entry supports file attachments and status management.
                    </p>
                    <ComplaintJournal />
                </div>
            </main>
        </div>
    );
}
