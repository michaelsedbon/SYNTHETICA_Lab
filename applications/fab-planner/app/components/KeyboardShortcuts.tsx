"use client";

// ── Keyboard Shortcuts Help Modal ───────────────
// Shows all available shortcuts grouped by category
// Uses shadcn Dialog component

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/app/components/ui/dialog";

interface ShortcutGroup {
    title: string;
    shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        title: "Navigation",
        shortcuts: [
            { keys: ["↑", "↓"], description: "Navigate between parts" },
            { keys: ["Enter"], description: "Open / focus selected part" },
            { keys: ["Escape"], description: "Deselect all / close panel" },
        ],
    },
    {
        title: "Actions",
        shortcuts: [
            { keys: ["N"], description: "Create new part" },
            { keys: ["Delete"], description: "Delete selected part(s)" },
            { keys: ["⌘", "Z"], description: "Undo last action" },
            { keys: ["⌘", "⇧", "Z"], description: "Redo last action" },
        ],
    },
    {
        title: "Views & Filters",
        shortcuts: [
            { keys: ["⌘", "K"], description: "Focus search bar" },
            { keys: ["F"], description: "Toggle filters" },
            { keys: ["T"], description: "Toggle timeline view" },
            { keys: ["P"], description: "Toggle project tree" },
        ],
    },
    {
        title: "General",
        shortcuts: [
            { keys: ["?"], description: "Show this shortcuts panel" },
            { keys: ["⌘", "P"], description: "Print current view" },
        ],
    },
];

export default function KeyboardShortcuts({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="shortcuts-modal">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                    <DialogDescription className="sr-only">
                        List of available keyboard shortcuts
                    </DialogDescription>
                </DialogHeader>
                <div className="shortcuts-grid">
                    {SHORTCUT_GROUPS.map((group) => (
                        <div key={group.title} className="shortcuts-group">
                            <h3 className="shortcuts-group-title">{group.title}</h3>
                            {group.shortcuts.map((shortcut, i) => (
                                <div key={i} className="shortcut-row">
                                    <div className="shortcut-keys">
                                        {shortcut.keys.map((key, ki) => (
                                            <span key={ki}>
                                                <kbd className="shortcut-key">{key}</kbd>
                                                {ki < shortcut.keys.length - 1 && (
                                                    <span className="shortcut-plus">+</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="shortcut-desc">{shortcut.description}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="shortcuts-footer">
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        Press <kbd className="shortcut-key">?</kbd> to toggle this panel
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
