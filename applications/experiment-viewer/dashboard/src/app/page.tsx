"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import mermaid from "mermaid";
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

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#3b82f6",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#475569",
    lineColor: "#64748b",
    secondaryColor: "#1e293b",
    tertiaryColor: "#0f172a",
    background: "#0f172a",
    mainBkg: "#1e293b",
    nodeBorder: "#475569",
    clusterBkg: "#1e293b",
    titleColor: "#e2e8f0",
    edgeLabelBackground: "#1e293b",
  },
});

let mermaidCounter = 0;

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const id = `mermaid-${Date.now()}-${mermaidCounter++}`;
    mermaid
      .render(id, code)
      .then((result) => {
        setSvg(result.svg);
      })
      .catch((err) => {
        setError(String(err));
      });
  }, [code]);

  if (error) {
    return (
      <pre className="text-red-400 text-sm p-4 bg-red-950/20 rounded-lg border border-red-900/30">
        <code>{code}</code>
        <div className="mt-2 text-xs opacity-60">Mermaid error: {error}</div>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram my-6 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ── Code panel types ────────────────────────────────────────────────

interface CodePanelState {
  open: boolean;
  content: string;
  filename: string;
  language: string;
  lineStart: number | null;
  lineEnd: number | null;
  loading: boolean;
}

const CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml",
  ".toml", ".sh", ".bash", ".r", ".java", ".c", ".cpp", ".h",
  ".go", ".rs", ".csv", ".tsv", ".sql", ".html", ".css", ".xml",
];

function isCodeFileLink(href: string): boolean {
  if (!href.startsWith("file:///")) return false;
  const pathPart = href.replace(/#.*$/, "");
  return CODE_EXTENSIONS.some((ext) => pathPart.endsWith(ext));
}

function parseFileLink(href: string): { path: string; lineStart: number | null; lineEnd: number | null } {
  const [pathPart, fragment] = href.split("#");
  const filePath = pathPart.replace("file://", "");
  let lineStart: number | null = null;
  let lineEnd: number | null = null;

  if (fragment) {
    // Parse #L141-L149 or #L141 or #L141-149
    const match = fragment.match(/^L(\d+)(?:[-–]L?(\d+))?$/);
    if (match) {
      lineStart = parseInt(match[1], 10);
      lineEnd = match[2] ? parseInt(match[2], 10) : lineStart;
    }
  }

  return { path: filePath, lineStart, lineEnd };
}

// ── Code Panel Component ────────────────────────────────────────────

// Map backend language names to highlight.js aliases
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

function CodePanel({
  state,
  onClose,
}: {
  state: CodePanelState;
  onClose: () => void;
}) {
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(520);
  const isDragging = useRef(false);
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

  // Syntax-highlight the entire file once
  const highlightedLines = useMemo(() => {
    if (!state.content) return [];
    const lang = HLJS_LANG_MAP[state.language] || state.language;
    let html: string;
    try {
      const result = hljs.highlight(state.content, { language: lang, ignoreIllegals: true });
      html = result.value;
    } catch {
      // Fallback: escape HTML
      html = state.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    // Split highlighted HTML by newline, preserving span tags
    return html.split("\n");
  }, [state.content, state.language]);

  // Raw lines for definition search
  const rawLines = useMemo(() => state.content.split("\n"), [state.content]);

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

  // Reset nav stack when file changes
  useEffect(() => {
    setNavStack([]);
    setFocusLine(null);
  }, [state.filename, state.content]);

  // Find definition of a word in the file (supports Python, JS/TS, Go, Rust, Java, C/C++)
  const findDefinition = useCallback((word: string): number | null => {
    if (!word || word.length < 2) return null;
    // Patterns: def word(, class word, async def word(, function word(,
    //           const/let/var word, word = (top-level assignment)
    const patterns = [
      new RegExp(`^\\s*(async\\s+)?def\\s+${word}\\s*\\(`),          // Python def
      new RegExp(`^\\s*class\\s+${word}[\\s:(]`),                    // class
      new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${word}\\s*[(<]`), // JS function
      new RegExp(`^\\s*(export\\s+)?(const|let|var)\\s+${word}\\s*[=:]`),      // JS const/let/var
      new RegExp(`^\\s*func\\s+${word}\\s*[(<]`),                    // Go func
      new RegExp(`^\\s*(pub\\s+)?fn\\s+${word}\\s*[(<]`),            // Rust fn
      new RegExp(`^[A-Z_]+\\s*=`),                                    // Python constant (skip)
      new RegExp(`^${word}\\s*=\\s*[^=]`),                           // Top-level assignment (Python)
    ];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          // For top-level assignment pattern, only match if it's actually for the word
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

  // Get word at click position from text content of the target
  const getWordAtClick = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
    const sel = window.getSelection();
    if (!sel) return null;
    // Use caretPositionFromPoint or caretRangeAtPoint
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return null;
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return null;
    const text = textNode.textContent || "";
    const offset = range.startOffset;
    // Find word boundaries around the offset
    let start = offset;
    let end = offset;
    while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) start--;
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) end++;
    const word = text.slice(start, end);
    // Get the line number from the closest <tr>
    const target = e.target as HTMLElement;
    const tr = target.closest("tr");
    const lineNum = tr ? parseInt(tr.getAttribute("data-line") || "0", 10) : 0;
    return { word, lineNum };
  }, []);

  // Scroll to a specific line
  const scrollToLine = useCallback((line: number) => {
    if (!codeAreaRef.current) return;
    setFocusLine(line);
    setTimeout(() => {
      const targetRow = codeAreaRef.current?.querySelector(`[data-line="${line}"]`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Clear focus highlight after a moment
      setTimeout(() => setFocusLine(null), 2000);
    }, 30);
  }, []);

  // Handle Cmd+click for go-to-definition
  const handleCodeClick = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const result = getWordAtClick(e);
    if (!result || !result.word) return;
    const defLine = findDefinition(result.word);
    if (defLine !== null && defLine !== result.lineNum) {
      // Push current visible line to nav stack for back navigation
      setNavStack((prev) => [...prev, result.lineNum]);
      scrollToLine(defLine);
    }
  }, [getWordAtClick, findDefinition, scrollToLine]);

  // Navigate back
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
    if (state.lineStart && codeAreaRef.current) {
      setTimeout(() => {
        const targetLine = codeAreaRef.current?.querySelector(
          `[data-line="${state.lineStart}"]`
        );
        if (targetLine) {
          targetLine.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  }, [state.content, state.lineStart]);

  // Drag to resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = panelRef.current?.offsetWidth || panelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(300, Math.min(startWidth + delta, window.innerWidth * 0.7));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [panelWidth]);

  return (
    <aside
      ref={panelRef}
      className="flex flex-col border-l border-border bg-sidebar relative"
      style={{ width: `${panelWidth}px`, minWidth: "300px", maxWidth: "70vw" }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />

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
            {state.filename}
          </span>
          {state.lineStart && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              L{state.lineStart}
              {state.lineEnd && state.lineEnd !== state.lineStart
                ? `–${state.lineEnd}`
                : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 ml-1"
            title="Close (Esc)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Code content */}
      <div ref={codeAreaRef} className={`flex-1 overflow-auto text-sm font-mono ${cmdHeld ? "cmd-held" : ""}`}>
        {state.loading ? (
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
                  state.lineStart !== null &&
                  state.lineEnd !== null &&
                  lineNum >= state.lineStart &&
                  lineNum <= state.lineEnd;
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
    </aside>
  );
}


// ── Types ──────────────────────────────────────────────────────────

interface MdFile {
  name: string;
  path: string;
  title: string;
  modified: number;
  source: string;
}

interface ExperimentGroup {
  key: string;
  label: string;
  summary: MdFile | null;
  files: MdFile[];
  source: string;
}

// ── API helpers ────────────────────────────────────────────────────

function apiBase(): string {
  if (typeof window === "undefined") return "http://localhost:8001";
  return `http://${window.location.hostname}:8001`;
}

async function fetchExperiments(): Promise<ExperimentGroup[]> {
  const res = await fetch(`${apiBase()}/api/experiments`);
  return res.json();
}

async function fetchFile(path: string, source: string): Promise<string> {
  const res = await fetch(
    `${apiBase()}/api/file?path=${encodeURIComponent(path)}&source=${encodeURIComponent(source)}`
  );
  const data = await res.json();
  return data.content;
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

// ── Component ──────────────────────────────────────────────────────

export default function ExperimentViewer() {
  const router = useRouter();
  const [groups, setGroups] = useState<ExperimentGroup[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>("Lab");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Context menu state for code links
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    href: string;
  } | null>(null);

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  // Code panel state
  const [codePanel, setCodePanel] = useState<CodePanelState>({
    open: false,
    content: "",
    filename: "",
    language: "text",
    lineStart: null,
    lineEnd: null,
    loading: false,
  });

  const openCodePanel = useCallback(async (href: string) => {
    const { path, lineStart, lineEnd } = parseFileLink(href);
    setCodePanel({
      open: true,
      content: "",
      filename: path.split("/").pop() || "file",
      language: "text",
      lineStart,
      lineEnd,
      loading: true,
    });

    try {
      const data = await fetchCodeFile(path);
      setCodePanel((prev) => ({
        ...prev,
        content: data.content,
        filename: data.filename,
        language: data.language,
        loading: false,
      }));
    } catch {
      setCodePanel((prev) => ({
        ...prev,
        content: "// Error: Could not load this file.",
        loading: false,
      }));
    }
  }, []);

  const closeCodePanel = useCallback(() => {
    setCodePanel((prev) => ({ ...prev, open: false }));
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Close code panel first, then navigate back from settings
        if (codePanel.open) {
          closeCodePanel();
        } else if (window.location.pathname === "/settings") {
          router.push("/");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [codePanel.open, closeCodePanel, router]);

  // Load experiment tree
  useEffect(() => {
    fetchExperiments().then((data) => {
      setGroups(data);
      // Auto-select first file
      if (data.length > 0 && data[0].files.length > 0) {
        handleSelect(data[0].files[0].path, data[0].source);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(async (path: string, source: string) => {
    setActivePath(path);
    setActiveSource(source);
    setLoading(true);

    // Auto-expand the sidebar group containing this file
    setGroups((currentGroups) => {
      for (const group of currentGroups) {
        if (group.source !== source) continue;
        const isChild = group.files.some((f) => f.path === path);
        if (isChild) {
          const groupKey = `${source}-${group.key}`;
          // Expand child files list
          setExpandedFiles((prev) => ({ ...prev, [groupKey]: true }));
          // Un-collapse group (for groups without summary that use the old toggle)
          setCollapsed((prev) => ({ ...prev, [groupKey]: false }));
          break;
        }
      }
      return currentGroups;
    });

    try {
      const md = await fetchFile(path, source);
      setContent(md);
    } catch {
      setContent("# Error\n\nCould not load this file.");
    }
    setLoading(false);
  }, []);

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFiles = (key: string) => {
    setExpandedFiles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter files by search
  const q = searchQuery.toLowerCase();
  const filteredGroups = groups
    .map((g) => {
      const matchesSearch = (f: MdFile) =>
        f.title.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q);
      const summaryMatches = g.summary && matchesSearch(g.summary);
      const filteredFiles = g.files.filter(matchesSearch);
      // Show group if summary or any child matches (or label matches)
      const labelMatches = g.label.toLowerCase().includes(q);
      return {
        ...g,
        summary: (summaryMatches || labelMatches || !q) ? g.summary : null,
        files: (labelMatches || summaryMatches) && !q ? g.files : filteredFiles,
      };
    })
    .filter((g) => g.summary || g.files.length > 0);

  // Group by source for sidebar section headers
  const sources = [...new Set(filteredGroups.map((g) => g.source))];

  // Resolve relative URLs in markdown to point to the API
  const resolveMediaUrl = (src: string, filePath: string | null): string => {
    if (!filePath || src.startsWith("http") || src.startsWith("mailto:") || src.startsWith("#")) return src;
    const dir = filePath.split("/").slice(0, -1).join("/");
    const resolved = dir ? `${dir}/${src}` : src;
    return `${apiBase()}/api/media?path=${encodeURIComponent(resolved)}&source=${encodeURIComponent(activeSource)}`;
  };

  // Keep backward-compat alias
  const resolveImageSrc = resolveMediaUrl;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={`
          flex flex-col border-r border-border bg-sidebar
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-72 min-w-[280px]" : "w-0 min-w-0 overflow-hidden"}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <span className="text-xl">📓</span>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Experiment Notebooks
          </h1>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md bg-muted/60 border border-border pl-8 pr-3 py-1.5
                         text-sm text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-1 focus:ring-ring
                         transition-colors"
            />
          </div>
        </div>

        {/* File tree — grouped by source */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {sources.map((source, sourceIdx) => (
            <div key={`source-${sourceIdx}-${source}`} className="mb-3">
              {/* Source section header */}
              {sources.length > 1 && (
                <div className="flex items-center gap-2 px-2 pt-2 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {source}
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              )}

              {filteredGroups
                .filter((g) => g.source === source)
                .map((group) => (
                  <div key={`${source}-${group.key}`} className="mb-1">
                    {/* Group header */}
                    {group.summary ? (
                      <div className="flex items-center gap-0">
                        {/* Expand/collapse arrow for child files */}
                        {group.files.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFiles(`${source}-${group.key}`);
                            }}
                            className="p-1.5 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                            title={expandedFiles[`${source}-${group.key}`] ? "Collapse files" : "Expand files"}
                          >
                            <svg
                              className={`h-3 w-3 transition-transform duration-200 ${expandedFiles[`${source}-${group.key}`] ? "rotate-90" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        {/* Summary title — clicking loads the summary file */}
                        <button
                          onClick={() => handleSelect(group.summary!.path, source)}
                          className={`
                            flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 text-sm rounded-md
                            transition-all duration-150
                            ${activePath === group.summary.path && activeSource === source
                              ? "bg-accent text-accent-foreground font-medium shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }
                          `}
                        >
                          <svg
                            className="h-4 w-4 flex-shrink-0 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                            />
                          </svg>
                          <span className="truncate font-medium">{group.label}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleGroup(`${source}-${group.key}`)}
                        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold
                                   text-muted-foreground uppercase tracking-wider
                                   hover:text-foreground transition-colors rounded-md
                                   hover:bg-muted/40"
                      >
                        <svg
                          className={`h-3 w-3 transition-transform duration-200 ${collapsed[`${source}-${group.key}`] ? "" : "rotate-90"
                            }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {group.label}
                      </button>
                    )}

                    {/* Child .md files — collapsible, hidden by default */}
                    {group.summary ? (
                      group.files.length > 0 && expandedFiles[`${source}-${group.key}`] && (
                        <div className="ml-5 border-l border-border/40 pl-2 mt-0.5 space-y-0.5">
                          {group.files.map((file) => (
                            <button
                              key={`${source}-${file.path}`}
                              onClick={() => handleSelect(file.path, source)}
                              className={`
                                flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md
                                transition-all duration-150
                                ${activePath === file.path && activeSource === source
                                  ? "bg-accent text-accent-foreground font-medium shadow-sm"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }
                              `}
                            >
                              <svg
                                className="h-3.5 w-3.5 flex-shrink-0 opacity-40"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                />
                              </svg>
                              <span className="truncate text-xs">{file.title}</span>
                            </button>
                          ))}
                        </div>
                      )
                    ) : (
                      !collapsed[`${source}-${group.key}`] && (
                        <div className="ml-2 mt-0.5 space-y-0.5">
                          {group.files.map((file) => (
                            <button
                              key={`${source}-${file.path}`}
                              onClick={() => handleSelect(file.path, source)}
                              className={`
                                flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md
                                transition-all duration-150
                                ${activePath === file.path && activeSource === source
                                  ? "bg-accent text-accent-foreground font-medium shadow-sm"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }
                              `}
                            >
                              <svg
                                className="h-3.5 w-3.5 flex-shrink-0 opacity-40"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                />
                              </svg>
                              <span className="truncate text-xs">{file.title}</span>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                ))}
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <p className="px-3 py-6 text-sm text-muted-foreground text-center">
              No matching files
            </p>
          )}
        </nav>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>
            {groups.reduce((a, g) => a + g.files.length + (g.summary ? 1 : 0), 0)} files
            {sources.length > 1 && ` · ${sources.length} sources`}
          </span>
          <button
            onClick={() => router.push("/settings")}
            className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          {activePath && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="px-1.5 py-0.5 bg-muted/50 rounded text-xs font-medium">
                {activeSource}
              </span>
              {activePath.split("/").map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="opacity-40">/</span>
                  <span
                    className={
                      i === arr.length - 1
                        ? "text-foreground font-medium"
                        : ""
                    }
                  >
                    {part}
                  </span>
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            </div>
          ) : activePath ? (
            <article className="max-w-4xl mx-auto px-8 py-8 markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
                urlTransform={(url) => {
                  // Allow file:/// URLs through (used for code file links)
                  if (url.startsWith("file:///")) return url;
                  // Default sanitization for everything else
                  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:") || url.startsWith("#") || url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return url;
                  // Relative paths
                  if (!url.includes(":")) return url;
                  return "";
                }}
                components={{
                  img: ({ src, alt, ...props }) => (
                    <figure className="figure-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveImageSrc(String(src || ""), activePath)}
                        alt={alt || ""}
                        loading="lazy"
                        {...props}
                      />
                      {alt && (
                        <figcaption>{alt}</figcaption>
                      )}
                    </figure>
                  ),
                  a: ({ href, children, ...props }) => {
                    // Intercept file:// links to code files → open side panel
                    if (href && isCodeFileLink(href)) {
                      return (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            openCodePanel(href);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, href });
                          }}
                          className="code-link"
                          title="Open in code panel"
                          {...props}
                        >
                          <svg
                            className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5 opacity-50"
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
                          {children}
                        </a>
                      );
                    }

                    // Intercept relative .md links to navigate within the app
                    if (
                      href &&
                      !href.startsWith("http") &&
                      !href.startsWith("mailto:") &&
                      !href.startsWith("#") &&
                      href.endsWith(".md")
                    ) {
                      const dir = activePath ? activePath.split("/").slice(0, -1).join("/") : "";
                      const resolved = dir ? `${dir}/${href}` : href;
                      // Normalize path (resolve ../ and ./)
                      const parts = resolved.split("/");
                      const normalized: string[] = [];
                      for (const part of parts) {
                        if (part === "." || part === "") continue;
                        if (part === ".." && normalized.length > 0) {
                          normalized.pop();
                        } else if (part !== "..") {
                          normalized.push(part);
                        }
                      }
                      const targetPath = normalized.join("/");
                      return (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelect(targetPath, activeSource);
                          }}
                          className="internal-link"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    }

                    const resolvedHref =
                      href && !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("#")
                        ? resolveMediaUrl(href, activePath)
                        : href;
                    return (
                      <a
                        href={resolvedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  code: ({ className, children, ...props }) => {
                    // Detect mermaid code blocks
                    const match = /language-mermaid/.exec(className || "");
                    if (match) {
                      const code = String(children).replace(/\n$/, "");
                      return <MermaidDiagram code={code} />;
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <span className="text-5xl block">📓</span>
                <p className="text-muted-foreground text-sm">
                  Select a file from the sidebar to begin reading
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Code Panel (right side) ── */}
      {codePanel.open && (
        <CodePanel
          state={codePanel}
          onClose={closeCodePanel}
        />
      )}

      {/* Custom context menu for code links */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
            onClick={() => {
              openCodePanel(contextMenu.href);
              setContextMenu(null);
            }}
          >
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            Open in code panel
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
            onClick={async () => {
              const { path, lineStart } = parseFileLink(contextMenu.href);
              try {
                await fetch(
                  `http://localhost:8001/api/open-in-editor?path=${encodeURIComponent(path)}&line=${lineStart || 1}`,
                  { method: "POST" }
                );
              } catch {
                // silently fail
              }
              setContextMenu(null);
            }}
          >
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Open in Antigravity
          </button>
          <div className="border-t border-border/50 my-1" />
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-left"
            onClick={() => {
              const { path } = parseFileLink(contextMenu.href);
              navigator.clipboard.writeText(path);
              setContextMenu(null);
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy file path
          </button>
        </div>
      )}
    </div>
  );
}
