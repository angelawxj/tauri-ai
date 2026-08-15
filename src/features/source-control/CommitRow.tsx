import { useEffect, useState } from "react";
import { IconChevronDown, IconChevronRight, IconCommitFile } from "./icons";
import type { GraphRow } from "./commit-graph";
import type { CommitInfo, FileEntry } from "./types";
import CommitGraph from "./CommitGraph";
import { STATUS_COLOR_CLASS, STATUS_LABELS } from "./status";
import { useSourceControlI18n } from "./i18n";

export const ROW_HEIGHT = 26;
const MAX_VISIBLE_REFS = 2;

function splitPath(path: string): { dir: string; name: string } {
  const index = path.lastIndexOf("/");
  return index === -1 ? { dir: "", name: path } : { dir: path.slice(0, index), name: path.slice(index + 1) };
}

function CommitFileRow({ file, onOpen }: { file: FileEntry; onOpen?: (path: string) => void }) {
  const { dir, name } = splitPath(file.path);
  const colorClass = STATUS_COLOR_CLASS[file.status];
  return (
    <button type="button" title={file.path} onClick={() => onOpen?.(file.path)} className="group flex w-full min-w-0 items-center gap-1 py-1 pl-9 pr-3 text-left text-xs hover:bg-vscode-list-hover focus:bg-vscode-list-hover focus:outline-none">
      <IconCommitFile size={14} className={`shrink-0 ${colorClass}`} />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-vscode-fg">{name}</span>
        {dir && <span className="ml-1.5 text-[11px] text-vscode-fg-dim">{dir}</span>}
      </span>
      <span className={`w-4 shrink-0 text-center text-[10px] font-bold ${colorClass}`}>{STATUS_LABELS[file.status]}</span>
    </button>
  );
}

interface CommitRowProps {
  commit: CommitInfo;
  graphRow: GraphRow;
  maxLanes: number;
  isHead: boolean;
  baseRefName?: string;
  expanded: boolean;
  onToggle: () => void;
  files: FileEntry[] | undefined;
  filesLoading: boolean;
  onOpenFile?: (path: string) => void;
}

function refClass(name: string, isHead: boolean, baseRefName?: string): string {
  if (isHead) return "border-vscode-accent text-vscode-accent";
  if (name === baseRefName) return "border-[#ea5c00] text-[#ea5c00]";
  if (name.endsWith("/main")) return "border-git-deleted text-git-deleted";
  return "border-vscode-border-light text-vscode-fg-muted";
}

export default function CommitRow({ commit, graphRow, maxLanes, isHead, baseRefName, expanded, onToggle, files, filesLoading, onOpenFile }: CommitRowProps) {
  const { lang, t } = useSourceControlI18n();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const subject = commit.message.split("\n")[0];
  const visibleRefs = commit.refs.slice(0, MAX_VISIBLE_REFS);
  const hiddenRefCount = commit.refs.length - visibleRefs.length;
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt(t.git.copyCommitInfo, value);
    }
    setMenu(null);
  };

  useEffect(() => {
    if (!menu) return;
    const dismiss = () => setMenu(null);
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", dismiss); };
  }, [menu]);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        onContextMenu={(event) => { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY }); }}
        aria-expanded={expanded}
        className="grid min-h-[26px] w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 px-3 py-0.5 text-left text-xs transition-colors hover:bg-vscode-list-hover"
        style={{ height: ROW_HEIGHT }}
      >
        <CommitGraph row={graphRow} maxLanes={maxLanes} rowHeight={ROW_HEIGHT} isHead={isHead} />
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          {expanded ? <IconChevronDown size={12} className="shrink-0 text-vscode-fg-muted" /> : <IconChevronRight size={12} className="shrink-0 text-vscode-fg-muted" />}
          <span className="min-w-0 flex-1 truncate text-vscode-fg" title={commit.message}>{subject}</span>
        </span>
        {(visibleRefs.length > 0 || hiddenRefCount > 0) && (
          <span className="flex shrink-0 items-center gap-1 overflow-hidden">
            {visibleRefs.map((ref) => <span key={ref} title={ref} className={`max-w-[128px] truncate rounded-full border bg-transparent px-1.5 py-0.5 text-[10px] leading-none ${refClass(ref, isHead, baseRefName)}`}>{ref}</span>)}
            {hiddenRefCount > 0 && <span className="text-[10px] leading-none text-vscode-fg-muted">+{hiddenRefCount}</span>}
          </span>
        )}
      </button>

      {menu && <div role="menu" className="fixed z-50 min-w-48 rounded-md border border-vscode-border-light bg-vscode-bg py-1 shadow-lg" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => void copy(commit.hash)} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.copyCommitHash}</button>
        <button type="button" onClick={() => void copy(commit.message)} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.copyCommitMessage}</button>
      </div>}

      {expanded && (
        <div className="border-l border-vscode-border bg-vscode-list-hover/30">
          <div className="px-3 py-1 pl-9 text-[11px] text-vscode-fg-dim">
            {commit.author} · {new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { month: "long", day: "numeric" }).format(new Date(commit.timestamp * 1000))}
          </div>
          {filesLoading && <div className="px-3 py-1 pl-9 text-[11px] text-vscode-fg-dim">{t.git.loadingCommitFiles}</div>}
          {!filesLoading && files && files.length === 0 && <div className="px-3 py-1 pl-9 text-[11px] text-vscode-fg-dim">{t.git.noFileChangesInCommit}</div>}
          {!filesLoading && files?.map((file) => <CommitFileRow key={file.path} file={file} onOpen={onOpenFile} />)}
        </div>
      )}
    </div>
  );
}
