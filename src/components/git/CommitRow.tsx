import { IconChevronDown, IconChevronRight } from "../icons";
import type { GraphRow } from "./commit-graph";
import type { CommitInfo, FileEntry } from "./types";
import CommitGraph, { LANE_WIDTH } from "./CommitGraph";
import FileRow from "./FileRow";
import { useI18n } from "../../i18n";

export const ROW_HEIGHT = 26;
const MAX_VISIBLE_REFS = 2;

interface CommitRowProps {
  commit: CommitInfo;
  graphRow: GraphRow;
  maxLanes: number;
  isHead: boolean;
  expanded: boolean;
  onToggle: () => void;
  files: FileEntry[] | undefined;
  filesLoading: boolean;
}

function refClass(name: string, isHead: boolean): string {
  if (isHead) return "border-vscode-accent text-vscode-accent";
  if (name === "main" || name.endsWith("/main")) return "border-git-deleted text-git-deleted";
  return "border-vscode-border-light text-vscode-fg-muted";
}

export default function CommitRow({ commit, graphRow, maxLanes, isHead, expanded, onToggle, files, filesLoading }: CommitRowProps) {
  const { t } = useI18n();
  const message = commit.message.split("\n")[0];
  const visibleRefs = commit.refs.slice(0, MAX_VISIBLE_REFS);
  const hiddenRefCount = commit.refs.length - visibleRefs.length;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid min-h-[26px] w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 px-3 py-0.5 text-left text-xs transition-colors hover:bg-vscode-list-hover"
        style={{ height: ROW_HEIGHT }}
      >
        <CommitGraph row={graphRow} maxLanes={maxLanes} rowHeight={ROW_HEIGHT} isHead={isHead} />
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          {expanded ? <IconChevronDown size={12} className="shrink-0 text-vscode-fg-muted" /> : <IconChevronRight size={12} className="shrink-0 text-vscode-fg-muted" />}
          <span className="min-w-0 flex-1 truncate text-vscode-fg" title={commit.message}>{message}</span>
        </span>
        {(visibleRefs.length > 0 || hiddenRefCount > 0) && (
          <span className="flex shrink-0 items-center gap-1 overflow-hidden">
            {visibleRefs.map((ref) => <span key={ref} title={ref} className={`max-w-[128px] truncate rounded-full border bg-vscode-panel px-1.5 py-0.5 text-[10px] leading-none ${refClass(ref, isHead)}`}>{ref}</span>)}
            {hiddenRefCount > 0 && <span className="text-[10px] leading-none text-vscode-fg-muted">+{hiddenRefCount}</span>}
          </span>
        )}
      </button>

      {expanded && (
        <div className="pb-1.5" style={{ paddingLeft: maxLanes * LANE_WIDTH + 20 }}>
          <div className="px-2 py-1 text-[11px] text-vscode-fg-dim">{commit.author} · {new Date(commit.timestamp * 1000).toLocaleString()} · {commit.shortHash}</div>
          {filesLoading && <div className="px-2 py-1 text-[11.5px] text-vscode-fg-dim">{t.git.loadingCommitFiles}</div>}
          {!filesLoading && files && files.length === 0 && <div className="px-2 py-1 text-[11.5px] text-vscode-fg-dim">{t.git.noFileChangesInCommit}</div>}
          {!filesLoading && files?.map((file) => <FileRow key={file.path} entry={file} variant="readonly" />)}
        </div>
      )}
    </div>
  );
}
