import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { IconChevronRight, IconLoader, IconX } from "./icons";
import { getFileTypeIcon } from "./fileTypeIcons";
import { useExplorerI18n } from "./i18n";
import type { ExplorerSearchResult } from "./types";

interface ExplorerSearchProps {
  onSelectFiles: () => void;
  onOpenFile?: (path: string) => void;
}

export default function ExplorerSearch({ onSelectFiles, onOpenFile }: ExplorerSearchProps) {
  const { t } = useExplorerI18n();
  const [query, setQuery] = useState("");
  const [includePattern, setIncludePattern] = useState("");
  const [excludePattern, setExcludePattern] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExplorerSearchResult | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void api
        .search(trimmed, caseSensitive, wholeWord, useRegex, includePattern, excludePattern)
        .then((nextResults) => {
          if (requestId !== requestIdRef.current) return;
          setResults(nextResults);
          setError(null);
        })
        .catch((searchError) => {
          if (requestId !== requestIdRef.current) return;
          setError(searchError instanceof Error ? searchError.message : t.explorer.searchFailed);
          setResults(null);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query, caseSensitive, wholeWord, useRegex, includePattern, excludePattern, t]);

  const toggleFile = (path: string) => {
    setCollapsedFiles((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-vscode-border px-2 py-1.5">
        <div className="flex flex-col gap-1">
          <div className="flex h-7 items-center gap-1 rounded-md border border-vscode-input-border bg-vscode-input-bg px-1.5 focus-within:border-vscode-accent">
            <span className="text-sm text-vscode-fg-muted">⌕</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.explorer.searchPlaceholder}
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-xs text-vscode-fg outline-none placeholder:text-vscode-fg-muted/60"
            />
            {loading && <IconLoader size={12} className="animate-spin text-vscode-fg-muted" />}
            {query && <button type="button" onClick={() => setQuery("")} className="rounded p-0.5 text-vscode-fg-muted hover:text-vscode-fg"><IconX size={11} /></button>}
            <button type="button" title={t.explorer.matchCase} onClick={() => setCaseSensitive((value) => !value)} className={`rounded px-1 py-0.5 text-[11px] ${caseSensitive ? "bg-vscode-list-active text-vscode-fg" : "text-vscode-fg-muted hover:bg-vscode-list-hover"}`}>Aa</button>
            <button type="button" title={t.explorer.matchWholeWord} onClick={() => setWholeWord((value) => !value)} className={`rounded px-1 py-0.5 text-[11px] underline ${wholeWord ? "bg-vscode-list-active text-vscode-fg" : "text-vscode-fg-muted hover:bg-vscode-list-hover"}`}>ab</button>
            <button type="button" title={t.explorer.useRegex} onClick={() => setUseRegex((value) => !value)} className={`rounded px-1 py-0.5 text-[11px] ${useRegex ? "bg-vscode-list-active text-vscode-fg" : "text-vscode-fg-muted hover:bg-vscode-list-hover"}`}>.*</button>
          </div>
          <div className="flex h-7 rounded-md bg-vscode-input-bg p-0.5 text-[11px]">
            <button type="button" onClick={onSelectFiles} className="flex-1 rounded text-vscode-fg-muted hover:bg-vscode-bg hover:text-vscode-fg">{t.explorer.names}</button>
            <button type="button" className="flex-1 rounded bg-vscode-bg font-medium text-vscode-fg shadow-sm">{t.explorer.contents}</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-b border-vscode-border px-2 py-1.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-vscode-fg-muted">{t.explorer.filesToInclude}</span>
          <input value={includePattern} onChange={(event) => setIncludePattern(event.target.value)} placeholder={t.explorer.includePlaceholder} spellCheck={false} className="h-7 rounded-md border border-vscode-input-border bg-vscode-input-bg px-2 text-xs text-vscode-fg outline-none placeholder:text-vscode-fg-muted/60 focus:border-vscode-accent" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-vscode-fg-muted">{t.explorer.filesToExclude}</span>
          <input value={excludePattern} onChange={(event) => setExcludePattern(event.target.value)} placeholder={t.explorer.excludePlaceholder} spellCheck={false} className="h-7 rounded-md border border-vscode-input-border bg-vscode-input-bg px-2 text-xs text-vscode-fg outline-none placeholder:text-vscode-fg-muted/60 focus:border-vscode-accent" />
        </label>
      </div>

      {results && results.totalMatches > 0 && <div className="border-b border-vscode-border px-2 py-1 text-[10px] text-vscode-fg-muted">{t.explorer.resultSummary(results.totalMatches, results.files.length)}{results.truncated ? ` ${t.explorer.resultsTruncated}` : ""}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {!query && <div className="flex h-32 items-center justify-center text-xs text-vscode-fg-muted">{t.explorer.typeToSearch}</div>}
        {query && !loading && !error && results?.totalMatches === 0 && <div className="flex h-32 items-center justify-center text-xs text-vscode-fg-muted">{t.explorer.noSearchResults}</div>}
        {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
        {results?.files.map((file) => {
          const collapsed = collapsedFiles.has(file.path);
          const separatorIndex = file.path.lastIndexOf("/");
          const fileName = separatorIndex === -1 ? file.path : file.path.slice(separatorIndex + 1);
          const parentPath = separatorIndex === -1 ? "" : file.path.slice(0, separatorIndex);
          const FileTypeIcon = getFileTypeIcon(file.path);
          return (
            <div key={file.path} className="pt-1.5">
              <button type="button" onClick={() => toggleFile(file.path)} title={file.path} className="group flex h-auto w-full items-center gap-1 px-2 py-0.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">
                <IconChevronRight size={12} className={`shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`} />
                <FileTypeIcon size={14} strokeWidth={2} className="shrink-0 text-vscode-fg-muted" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-vscode-fg">{fileName}</span>
                  {parentPath && <span className="ml-1.5 text-[11px] text-vscode-fg-muted">{parentPath}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-vscode-badge-bg px-1.5 text-[10px] text-vscode-fg-muted">{file.matches.length}</span>
              </button>
              {!collapsed && file.matches.map((match, index) => (
                <button key={`${match.line}:${match.column}:${index}`} type="button" onMouseDown={(event) => event.button === 0 && event.preventDefault()} onClick={() => onOpenFile?.(file.path)} title={match.preview} className="flex min-h-[18px] h-auto w-full items-center gap-1 py-px pl-7 pr-2 text-left hover:bg-vscode-list-hover">
                  <span className="mt-px shrink-0 text-[10px] tabular-nums text-vscode-fg-muted">{match.line}</span>
                  <span className="flex min-w-0 items-baseline whitespace-pre text-xs">
                    <span className="shrink-0 text-vscode-fg-muted">{match.beforeText}</span>
                    <span className="shrink-0 rounded-sm bg-amber-500/30 text-vscode-fg">{match.matchedText}</span>
                    <span className="min-w-0 truncate text-vscode-fg-muted">{match.afterText}</span>
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
