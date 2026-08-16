import { useState } from "react";
import { IconChevronRight, IconFile, IconFolder, IconFolderOpen, IconLoader } from "./icons";
import { api, isApiUnavailable } from "./api";
import { useExplorerI18n } from "./i18n";
import type { ExplorerEntry } from "./types";

interface ExplorerRowProps {
  entry: ExplorerEntry;
  depth: number;
  onOpenFile: (path: string) => void;
}

export default function ExplorerRow({ entry, depth, onOpenFile }: ExplorerRowProps) {
  const { t } = useExplorerI18n();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ExplorerEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 对齐 Orca FileExplorerRow：每层缩进 16px + 8px 基础偏移
  const paddingLeft = depth * 16 + 8;

  const toggle = () => {
    if (!entry.isDir) {
      onOpenFile(entry.path);
      return;
    }
    if (!expanded && children === null) {
      setLoading(true);
      setError(null);
      api
        .listDir(entry.path)
        .then((entries) => setChildren(entries))
        .catch((err) => {
          if (isApiUnavailable(err)) return;
          setError(err instanceof Error ? err.message : t.explorer.loadDirFailed);
        })
        .finally(() => setLoading(false));
    }
    setExpanded((v) => !v);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        title={entry.path}
        style={{ paddingLeft }}
        className="flex w-full items-center gap-1 rounded-sm py-1 pr-2 text-left text-xs text-vscode-fg transition-colors hover:bg-vscode-list-hover"
      >
        {entry.isDir ? (
          <IconChevronRight size={13} className={`shrink-0 text-vscode-fg-muted transition-transform ${expanded ? "rotate-90" : ""}`} />
        ) : (
          <span className="size-[13px] shrink-0" />
        )}
        {entry.isDir ? (
          loading ? (
            <IconLoader size={13} className="shrink-0 animate-spin text-vscode-fg-muted" />
          ) : expanded ? (
            <IconFolderOpen size={13} className="shrink-0 text-vscode-fg-muted" />
          ) : (
            <IconFolder size={13} className="shrink-0 text-vscode-fg-muted" />
          )
        ) : (
          <IconFile size={13} className="shrink-0 text-vscode-fg-muted" />
        )}
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
      </button>

      {entry.isDir && expanded && (
        <div>
          {!loading && error && <div style={{ paddingLeft: paddingLeft + 20 }} className="py-1 text-[11px] text-red-400">{error}</div>}
          {!loading && !error && children && children.length === 0 && (
            <div style={{ paddingLeft: paddingLeft + 20 }} className="py-1 text-[11px] text-vscode-fg-dim">{t.explorer.emptyDirectory}</div>
          )}
          {!loading && !error && children?.map((child) => (
            <ExplorerRow key={child.path} entry={child} depth={depth + 1} onOpenFile={onOpenFile} />
          ))}
        </div>
      )}
    </div>
  );
}
