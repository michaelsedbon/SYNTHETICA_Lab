"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import hljs from "highlight.js";

// ── Theme definitions ──────────────────────────────────────────────
const CODE_THEMES = [
    { id: "github-dark-dimmed", label: "GitHub Dark Dimmed" },
    { id: "atom-one-dark", label: "Atom One Dark" },
    { id: "night-owl", label: "Night Owl" },
    { id: "tokyo-night-dark", label: "Tokyo Night" },
    { id: "vs2015", label: "VS 2015" },
    { id: "monokai", label: "Monokai" },
] as const;
const DEFAULT_THEME = "github-dark-dimmed";
const HLJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles";

const HLJS_LANG_MAP: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    typescript: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    json: "json",
    yaml: "yaml",
    toml: "ini",
    bash: "bash",
    r: "r",
    java: "java",
    c: "c",
    cpp: "cpp",
    go: "go",
    rust: "rust",
    sql: "sql",
    html: "xml",
    css: "css",
    xml: "xml",
};

function apiBase(): string {
    if (typeof window === "undefined") return "http://localhost:8001";
    return `http://${window.location.hostname}:8001`;
}

async function fetchCodeFile(
    absPath: string
): Promise<{ content: string; filename: string; language: string }> {
    const res = await fetch(
        `${apiBase()}/api/code?path=${encodeURIComponent(absPath)}`
    );
    if (!res.ok) throw new Error(`Failed to load code file: ${res.status}`);
    return res.json();
}

function parseSearchParams(path: string, line: string | null): {
    filePath: string;
    lineStart: number | null;
    lineEnd: number | null;
} {
    let lineStart: number | null = null;
    let lineEnd: number | null = null;

    if (line) {
        const match = line.match(/^(\d+)(?:[-–](\d+))?$/);
        if (match) {
            lineStart = parseInt(match[1], 10);
            lineEnd = match[2] ? parseInt(match[2], 10) : lineStart;
        }
    }

    return { filePath: path, lineStart, lineEnd };
}

// ── Main standalone code viewer ────────────────────────────────────

function CodeViewerInner() {
    const searchParams = useSearchParams();
    const pathParam = searchParams.get("path") || "";
    const lineParam = searchParams.get("line");

    const { filePath, lineStart, lineEnd } = parseSearchParams(pathParam, lineParam);

    const codeAreaRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState("");
    const [filename, setFilename] = useState("");
    const [language, setLanguage] = useState("text");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [cmdHeld, setCmdHeld] = useState(false);
    const [navStack, setNavStack] = useState<number[]>([]);
    const [focusLine, setFocusLine] = useState<number | null>(null);

    // Dynamic theme loading
    const [codeTheme, setCodeTheme] = useState(DEFAULT_THEME);
    useEffect(() => {
        const saved = localStorage.getItem("code-theme");
        if (saved && CODE_THEMES.some((t) => t.id === saved)) setCodeTheme(saved);
    }, []);
    useEffect(() => {
        const linkId = "hljs-theme-link";
        let link = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement("link");
            link.id = linkId;
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        link.href = `${HLJS_CDN}/${codeTheme}.min.css`;
        localStorage.setItem("code-theme", codeTheme);
    }, [codeTheme]);

    // Load the file
    useEffect(() => {
        if (!filePath) {
            setError("No file path specified");
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchCodeFile(filePath)
            .then((data) => {
                setContent(data.content);
                setFilename(data.filename);
                setLanguage(data.language);
                setLoading(false);
                // Set document title
                document.title = `${data.filename} — Code Viewer`;
            })
            .catch((err) => {
                setError(String(err));
                setLoading(false);
            });
    }, [filePath]);

    // Syntax highlighting
    const highlightedLines = useMemo(() => {
        if (!content) return [];
        const lang = HLJS_LANG_MAP[language] || language;
        let html: string;
        try {
            const result = hljs.highlight(content, { language: lang, ignoreIllegals: true });
            html = result.value;
        } catch {
            html = content
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
        }
        return html.split("\n");
    }, [content, language]);

    const rawLines = useMemo(() => content.split("\n"), [content]);

    // Track Cmd/Ctrl key state
    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.metaKey || e.ctrlKey) setCmdHeld(true); };
        const up = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey) setCmdHeld(false); };
        const blur = () => setCmdHeld(false);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        window.addEventListener("blur", blur);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            window.removeEventListener("blur", blur);
        };
    }, []);

    // Find definition
    const findDefinition = useCallback((word: string): number | null => {
        if (!word || word.length < 2) return null;
        const patterns = [
            new RegExp(`^\\s*(async\\s+)?def\\s+${word}\\s*\\(`),
            new RegExp(`^\\s*class\\s+${word}[\\s:(]`),
            new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${word}\\s*[(<]`),
            new RegExp(`^\\s*(export\\s+)?(const|let|var)\\s+${word}\\s*[=:]`),
            new RegExp(`^\\s*func\\s+${word}\\s*[(<]`),
            new RegExp(`^\\s*(pub\\s+)?fn\\s+${word}\\s*[(<]`),
            new RegExp(`^[A-Z_]+\\s*=`),
            new RegExp(`^${word}\\s*=\\s*[^=]`),
        ];
        for (let i = 0; i < rawLines.length; i++) {
            const line = rawLines[i];
            for (const pattern of patterns) {
                if (pattern.test(line)) {
                    if (pattern === patterns[patterns.length - 1]) {
                        if (line.trimStart().startsWith(word)) return i + 1;
                    } else if (pattern !== patterns[patterns.length - 2]) {
                        return i + 1;
                    }
                }
            }
        }
        return null;
    }, [rawLines]);

    const getWordAtClick = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (!range) return null;
        const textNode = range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return null;
        const text = textNode.textContent || "";
        const offset = range.startOffset;
        let start = offset;
        let end = offset;
        while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) start--;
        while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) end++;
        const word = text.slice(start, end);
        const target = e.target as HTMLElement;
        const tr = target.closest("tr");
        const lineNum = tr ? parseInt(tr.getAttribute("data-line") || "0", 10) : 0;
        return { word, lineNum };
    }, []);

    const scrollToLine = useCallback((line: number) => {
        if (!codeAreaRef.current) return;
        setFocusLine(line);
        setTimeout(() => {
            const targetRow = codeAreaRef.current?.querySelector(`[data-line="${line}"]`);
            if (targetRow) {
                targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            setTimeout(() => setFocusLine(null), 2000);
        }, 30);
    }, []);

    const handleCodeClick = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        const result = getWordAtClick(e);
        if (!result || !result.word) return;
        const defLine = findDefinition(result.word);
        if (defLine !== null && defLine !== result.lineNum) {
            setNavStack((prev) => [...prev, result.lineNum]);
            scrollToLine(defLine);
        }
    }, [getWordAtClick, findDefinition, scrollToLine]);

    const navigateBack = useCallback(() => {
        setNavStack((prev) => {
            if (prev.length === 0) return prev;
            const newStack = [...prev];
            const line = newStack.pop()!;
            scrollToLine(line);
            return newStack;
        });
    }, [scrollToLine]);

    // Scroll to highlighted lines when content loads
    useEffect(() => {
        if (lineStart && codeAreaRef.current) {
            setTimeout(() => {
                const targetLine = codeAreaRef.current?.querySelector(
                    `[data-line="${lineStart}"]`
                );
                if (targetLine) {
                    targetLine.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 50);
        }
    }, [content, lineStart]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="text-center space-y-3">
                    <span className="text-5xl block">⚠️</span>
                    <p className="text-muted-foreground text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-sidebar">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Back button */}
                    {navStack.length > 0 && (
                        <button
                            onClick={navigateBack}
                            className="p-1 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                            title="Go back (navigate history)"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </button>
                    )}
                    <svg
                        className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                        />
                    </svg>
                    <span className="text-sm font-medium text-foreground truncate">
                        {filename || filePath.split("/").pop() || "Loading..."}
                    </span>
                    {lineStart && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                            L{lineStart}
                            {lineEnd && lineEnd !== lineStart ? `–${lineEnd}` : ""}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {/* Full path display */}
                    <span className="text-[10px] text-muted-foreground/40 mr-2 truncate max-w-[400px]" title={filePath}>
                        {filePath}
                    </span>
                    <select
                        value={codeTheme}
                        onChange={(e) => setCodeTheme(e.target.value)}
                        className="text-[11px] bg-muted/40 text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 outline-none hover:bg-muted/60 transition-colors cursor-pointer"
                        title="Syntax theme"
                    >
                        {CODE_THEMES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                    <span className="text-[10px] text-muted-foreground/50 ml-1">⌘+click → def</span>
                </div>
            </div>

            {/* Code content */}
            <div ref={codeAreaRef} className={`flex-1 overflow-auto text-sm font-mono ${cmdHeld ? "cmd-held" : ""}`}>
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs">Loading…</span>
                        </div>
                    </div>
                ) : (
                    <table className="w-full border-collapse" onClick={handleCodeClick}>
                        <tbody>
                            {highlightedLines.map((lineHtml, i) => {
                                const lineNum = i + 1;
                                const isHighlighted =
                                    lineStart !== null &&
                                    lineEnd !== null &&
                                    lineNum >= lineStart &&
                                    lineNum <= lineEnd;
                                const isFocused = focusLine === lineNum;

                                return (
                                    <tr
                                        key={lineNum}
                                        data-line={lineNum}
                                        className={
                                            isFocused
                                                ? "bg-blue-500/20"
                                                : isHighlighted
                                                    ? "bg-yellow-500/15"
                                                    : "hover:bg-muted/30"
                                        }
                                    >
                                        <td
                                            className={`
                        select-none text-right pr-4 pl-4 py-0 align-top
                        border-r border-border/40 whitespace-nowrap
                        ${isFocused ? "text-blue-400/80" : isHighlighted ? "text-yellow-400/80" : "text-muted-foreground/40"}
                      `}
                                            style={{ width: "1px", fontSize: "12px", lineHeight: "20px" }}
                                        >
                                            {lineNum}
                                        </td>
                                        <td
                                            className="px-4 py-0 whitespace-pre hljs"
                                            style={{ fontSize: "12px", lineHeight: "20px" }}
                                            dangerouslySetInnerHTML={{ __html: lineHtml || " " }}
                                        />
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default function StandaloneCodeViewer() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen bg-sidebar">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading…</span>
                    </div>
                </div>
            }
        >
            <CodeViewerInner />
        </Suspense>
    );
}
