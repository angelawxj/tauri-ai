import { IconChevronDown, IconChevronRight } from "../icons";
import type { GraphRow } from "./commit-graph";
import type { CommitInfo, FileEntry } from "./types";
import CommitGraph, { LANE_WIDTH } from "./CommitGraph";
import FileRow from "./FileRow";
import { useI18n, type TranslationDict } from "../../i18n";

export const ROW_HEIGHT = 42;

function formatRelativeTime(unixSeconds: number, t: TranslationDict): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return t.git.justNow;
  if (diffMin < 60) return t.git.minutesAgo(diffMin);
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t.git.hoursAgo(diffHour);
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return t.git.daysAgo(diffDay);

  const date = new Date(unixSeconds * 1000);
  return date.toISOString().slice(0, 10);
}

interface CommitRowProps {
  commit: CommitInfo;
  graphRow: GraphRow;
  maxLanes: number;
  expanded: boolean;
  onToggle: () => void;
  files: FileEntry[] | undefined;
  filesLoading: boolean;
}

export default function CommitRow({
  commit,
  graphRow,
  maxLanes,
  expanded,
  onToggle,
  files,
  filesLoading,
}: CommitRowProps) {
  const { t } = useI18n();
  const messageFirstLine = commit.message.split("\n")[0];

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        className="flex w-full items-stretch gap-1.5 px-2 hover:bg-vscode-list-hover"
        style={{ height: ROW_HEIGHT }}
      >
        <CommitGraph row={graphRow} maxLanes={maxLanes} rowHeight={ROW_HEIGHT} />
        <span className="flex shrink-0 items-center text-vscode-fg-dim">
          {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-[12.5px] text-vscode-fg">{messageFirstLine}</span>
          <span className="truncate text-[11px] text-vscode-fg-dim">
            {commit.author} · {formatRelativeTime(commit.timestamp, t)} · {commit.shortHash}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="pb-1.5" style={{ paddingLeft: maxLanes * LANE_WIDTH + 8 + 12 }}>
          {filesLoading && <div className="px-2 py-1 text-[11.5px] text-vscode-fg-dim">{t.git.loadingCommitFiles}</div>}
          {!filesLoading && files && files.length === 0 && (
            <div className="px-2 py-1 text-[11.5px] text-vscode-fg-dim">{t.git.noFileChangesInCommit}</div>
          )}
          {!filesLoading &&
            files?.map((f) => <FileRow key={f.path} entry={f} variant="readonly" />)}
        </div>
      )}
    </div>
  );
}
