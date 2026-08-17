import { IconChevronRight, IconFolder, IconFolderOpen, IconLoader } from "./icons";
import { getFileTypeIcon } from "./fileTypeIcons";
import { CircleSlash } from "lucide-react";
import type { ExplorerEntry } from "./types";
import type { FileStatus } from "../source-control/types";
import { STATUS_COLOR_VALUE } from "../source-control/status";

interface ExplorerRowProps {
  entry: ExplorerEntry;
  depth: number;
  isExpanded: boolean;
  isLoading: boolean;
  isSelected: boolean;
  isDropTarget: boolean;
  gitStatus?: FileStatus;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: React.DragEvent<HTMLButtonElement>) => void;
}

/** 纯展示行：展开态/选中态/加载态/拖拽都由 Explorer.tsx 的集中状态驱动，自己不再维护任何 state。 */
export default function ExplorerRow({
  entry,
  depth,
  isExpanded,
  isLoading,
  isSelected,
  isDropTarget,
  gitStatus,
  onClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: ExplorerRowProps) {
  const paddingLeft = depth * 16 + 8;
  const FileTypeIcon = getFileTypeIcon(entry.path);

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={entry.path}
      style={{ paddingLeft }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={entry.isDir ? onDragOver : undefined}
      onDragLeave={entry.isDir ? onDragLeave : undefined}
      onDrop={entry.isDir ? onDrop : undefined}
      className={`flex w-full items-center gap-1 rounded-sm py-1 pr-2 text-left text-xs transition-colors ${
        isSelected ? "bg-vscode-list-active text-vscode-fg" : "text-vscode-fg hover:bg-vscode-list-hover"
      } ${isDropTarget ? "bg-vscode-accent/20 ring-1 ring-inset ring-vscode-accent" : ""}`}
    >
      {entry.isDir ? (
        <IconChevronRight size={13} className={`shrink-0 text-vscode-fg-muted transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      ) : (
        <span className="size-[13px] shrink-0" />
      )}
      {entry.isDir ? (
        isLoading ? (
          <IconLoader size={13} className="shrink-0 animate-spin text-vscode-fg-muted" />
        ) : isExpanded ? (
          <IconFolderOpen size={13} className="shrink-0 text-vscode-fg-muted" />
        ) : (
          <IconFolder size={13} className="shrink-0 text-vscode-fg-muted" />
        )
      ) : (
        <FileTypeIcon size={13} strokeWidth={2} className="shrink-0 text-vscode-fg-muted" />
      )}
      <span
        className={`min-w-0 flex-1 truncate ${entry.ignored && !gitStatus ? "italic pr-0.5" : ""}`}
        style={gitStatus ? { color: STATUS_COLOR_VALUE[gitStatus] } : entry.ignored ? { color: "var(--git-decoration-ignored)" } : undefined}
      >{entry.name}</span>
      {gitStatus && <span className="mr-2 ml-auto shrink-0 text-[10px] font-semibold tracking-wide" style={{ color: STATUS_COLOR_VALUE[gitStatus] }}>{gitStatus}</span>}
      {!gitStatus && entry.ignored && <CircleSlash aria-label="Ignored by .gitignore" size={12} className="mr-2 ml-auto shrink-0" style={{ color: "var(--git-decoration-ignored)" }} />}
    </button>
  );
}
