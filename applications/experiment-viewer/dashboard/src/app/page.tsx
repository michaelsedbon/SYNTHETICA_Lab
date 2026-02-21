"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark-dimmed.css";

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

// ── Component ──────────────────────────────────────────────────────

export default function ExperimentViewer() {
  const [groups, setGroups] = useState<ExperimentGroup[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>("Lab");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
  const resolveMediaUrl = useCallback((src: string, filePath: string | null, source?: string): string => {
    const s = source || activeSource;
    if (!filePath || src.startsWith("http") || src.startsWith("mailto:") || src.startsWith("#")) return src;
    const dir = filePath.split("/").slice(0, -1).join("/");
    const resolved = dir ? `${dir}/${src}` : src;
    return `${apiBase()}/api/media?path=${encodeURIComponent(resolved)}&source=${encodeURIComponent(s)}`;
  }, [activeSource]);

  // Pre-process markdown: replace image + interactive-link pairs with plotly embeds
  const processedContent = useMemo(() => {
    if (!content || !activePath) return content;
    // Match: ![alt](path/to/img.png)\n\n[→ Interactive version](path/to/file.html)
    return content.replace(
      /!\[([^\]]*)\]\(([^)]+\.png)\)\s*\n\s*\n\s*\[→ Interactive version\]\(([^)]+\.html)\)/g,
      (_match, alt, _imgSrc, htmlSrc) => {
        const iframeSrc = resolveMediaUrl(htmlSrc, activePath);
        return `<div class="plotly-embed" data-alt="${alt}"><iframe src="${iframeSrc}" loading="lazy"></iframe></div>`;
      }
    );
  }, [content, activePath, resolveMediaUrl]);

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
                    {/* Group header (collapsible) */}
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

                    {!collapsed[`${source}-${group.key}`] && (
                      <div className="ml-2 mt-0.5 space-y-0.5">
                        {/* Summary.md — primary entry */}
                        {group.summary && (
                          <button
                            key={`${source}-${group.summary.path}`}
                            onClick={() => handleSelect(group.summary!.path, source)}
                            className={`
                              flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md
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
                            <span className="truncate font-medium">{group.summary.title}</span>
                          </button>
                        )}

                        {/* Child .md files — indented under summary */}
                        {group.files.length > 0 && (
                          <div className={group.summary ? "ml-4 border-l border-border/40 pl-2 space-y-0.5" : "space-y-0.5"}>
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
                        )}
                      </div>
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
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {groups.reduce((a, g) => a + g.files.length + (g.summary ? 1 : 0), 0)} files
          {sources.length > 1 && ` · ${sources.length} sources`}
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
                }}
              >
                {processedContent}
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
    </div>
  );
}
