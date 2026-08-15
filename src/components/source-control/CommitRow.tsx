import { IconChevronDown, IconChevronRight } from "../icons";
import type { GraphRow } from "./commit-graph";
import type { CommitInfo, FileEntry } from "./types";
import CommitGraph, { LANE_WIDTH } from "./CommitGraph";
import RefBadge from "./RefBadge";
import FileRow from "./FileRow";

export const ROW_HEIGHT = 28;
const MAX_VISIBLE_REFS = 2;

function formatFullTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

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

export default function CommitRow({
  commit,
  graphRow,
  maxLanes,
  isHead,
  expanded,
  onToggle,
  files,
  filesLoading,
}: CommitRowProps) {
  const messageFirstLine = commit.message.split("\n")[0];
  const isMerge = commit.parents.length > 1;
  const visibleRefs = commit.refs.slice(0, MAX_VISIBLE_REFS);
  const overflowCount = commit.refs.length - visibleRefs.length;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        className="grid w-full items-center gap-1.5 px-2 hover:bg-vscode-list-hover"
        style={{ height: ROW_HEIGHT, gridTemplateColumns: "auto auto minmax(0,1fr) auto" }}
      >
        <CommitGraph row={graphRow} maxLanes={maxLanes} rowHeight={ROW_HEIGHT} isHead={isHead} isMerge={isMerge} />
        <span className="flex shrink-0 items-center text-vscode-fg-dim">
          {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </span>
        <span className="min-w-0 truncate text-[12.5px] text-vscode-fg" title={commit.message}>
          {messageFirstLine}
        </span>
        {(visibleRefs.length > 0 || overflowCount > 0) && (
          <span className="flex shrink-0 items-center gap-1">
            {visibleRefs.map((ref) => (
              <RefBadge key={ref} name={ref} />
            ))}
            {overflowCount > 0 && <RefBadge name={`+${overflowCount}`} />}
          </span>
        )}
      </div>

      {expanded && (
        <div className="pb-1.5" style={{ paddingLeft: maxLanes * LANE_WIDTH + 8 + 12 }}>
          <div className="px-2 py-1 text-[11px] text-vscode-fg-dim">
            {commit.author} · {formatFullTimestamp(commit.timestamp)} · {commit.hash}
          </div>
          {filesLoading && <div className="px-2 py-1 text-[11.5px] text-vscode-fg-dim">加载改动文件…</div>}
          {!filesLoading && files && files.length === 0 && (
            <div className="px-2 py-1 text-[11.5px] text-vscode-fg-dim">此提交没有文件改动</div>
          )}
          {!filesLoading && files?.map((f) => <FileRow key={f.path} entry={f} variant="readonly" />)}
        </div>
      )}
    </div>
  );
}
