"use client";

import { toast } from "sonner";
import { Toaster as SonnerToaster } from "@/app/components/ui/sonner";

// ── Toast Types (kept for backward compat) ──────
export interface ToastItem {
    id: string;
    message: string;
    type: "success" | "error" | "info" | "undo";
    action?: { label: string; onClick: () => void };
    duration: number;
    createdAt: number;
}

/** Call from anywhere: showToast("Saved!", "success") */
export function showToast(
    message: string,
    type: ToastItem["type"] = "info",
    action?: ToastItem["action"]
) {
    const opts: Parameters<typeof toast>[1] = {
        duration: type === "error" ? 5000 : 3000,
    };

    if (action) {
        opts.action = {
            label: action.label,
            onClick: action.onClick,
        };
    }

    switch (type) {
        case "success":
            toast.success(message, opts);
            break;
        case "error":
            toast.error(message, opts);
            break;
        case "undo":
            toast.info(message, opts);
            break;
        default:
            toast(message, opts);
            break;
    }
}

// ── Component ───────────────────────────────────
export default function Toaster() {
    return <SonnerToaster position="bottom-right" />;
}
