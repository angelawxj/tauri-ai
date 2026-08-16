import { useEffect, useState } from "react";
import { IconListFilter, IconRefresh, IconX } from "./icons";
import { api, isApiUnavailable } from "./api";
import { useExplorerI18n } from "./i18n";
import "./theme.css";
import ExplorerRow from "./ExplorerRow";
import type { ExplorerEntry } from "./types";

interface ExplorerProps {
  onOpenFile?: (path: string) => void;
  /** 当前项目名，对齐 Orca FileExplorerToolbar 头部展示 repoName 的方式；缺省时退回通用标题。 */
  projectName?: string;
}

export default function Explorer({ onOpenFile, projectName }: ExplorerProps) {
  const { t } = useExplorerI18n();
  const [entries, setEntries] = useState<ExplorerEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const refresh = () => {
    setLoading(true);
    setError(null);
    api
      .listDir()
      .then((next) => {
        setEntries(next);
        setUnavailable(false);
      })
      .catch((err) => {
        if (isApiUnavailable(err)) {
          setUnavailable(true);
          return;
        }
        setError(err instanceof Error ? err.message : t.explorer.loadDirFailed);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleEntries = entries?.filter((entry) => entry.name.toLocaleLowerCase().includes(filterQuery.trim().toLocaleLowerCase())) ?? [];

  return (
    <div className="explorer-theme flex h-full flex-col overflow-hidden bg-vscode-bg">
      <div className="flex h-8 min-h-8 shrink-0 items-center gap-2 border-b border-vscode-border px-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-vscode-fg">{projectName || t.explorer.title}</span>
        <button type="button" title={t.common.refresh} onClick={refresh} className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"><IconRefresh size={13} /></button>
      </div>

      {/* 常驻的按名称过滤行，对齐 Orca FileExplorerQueryStrip + FileExplorerNameFilter（不做旁边的 Names/Contents 切换，因为没有全文搜索后端） */}
      <div className="border-b border-vscode-border px-2 py-1.5">
        <div className="flex h-7 items-center gap-1 rounded-sm border border-vscode-input-border bg-vscode-input-bg px-1.5 focus-within:border-vscode-accent">
          <IconListFilter size={14} className="shrink-0 text-vscode-fg-muted" />
          <input
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder={t.explorer.filterFiles}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-1 text-xs text-vscode-fg outline-none placeholder:text-vscode-fg-muted/60"
          />
          {filterQuery && (
            <button type="button" title={t.common.close} onClick={() => setFilterQuery("")} className="shrink-0 rounded-sm p-0.5 text-vscode-fg-muted hover:text-vscode-fg">
              <IconX size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {unavailable && <div className="px-4 py-3 text-center text-[11px] leading-relaxed text-vscode-fg-muted">{t.explorer.browserPreviewNotice}</div>}
        {!unavailable && loading && <div className="flex h-full items-center justify-center text-[11px] text-vscode-fg-muted">{t.explorer.loadingTree}</div>}
        {!unavailable && !loading && error && <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-vscode-fg-muted">{error}</div>}
        {!unavailable && !loading && !error && visibleEntries.length === 0 && (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-vscode-fg-muted">{t.explorer.emptyDirectory}</div>
        )}
        {!unavailable && !loading && !error && visibleEntries.map((entry) => (
          <ExplorerRow key={entry.path} entry={entry} depth={0} onOpenFile={(path) => onOpenFile?.(path)} />
        ))}
      </div>
    </div>
  );
}
