"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "dark";
    try {
        const stored = localStorage.getItem("fab-planner-theme");
        if (stored === "light" || stored === "dark") return stored;
    } catch { /* ignore */ }
    return "dark";
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const stored = getStoredTheme();
        setTheme(stored);
        document.documentElement.setAttribute("data-theme", stored);
    }, []);

    const toggle = useCallback(() => {
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("fab-planner-theme", next);
            return next;
        });
    }, []);

    return (
        <button
            className="btn btn-sm theme-toggle"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}
