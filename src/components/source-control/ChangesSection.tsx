import { useState } from "react";
import { IconChevronDown, IconChevronRight, IconMinus, IconPlus, IconUndo } from "../icons";
import FileRow from "./FileRow";
import type { FileEntry } from "./types";

interface ChangesSectionProps {
  title: string;
  entries: FileEntry[];
  variant: "staged" | "unstaged";
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onDiscard?: (path: string) => void;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardAll?: () => void;
  onOpenDiff?: (path: string, staged: boolean) => void;
}

export default function ChangesSection({
  title,
  entries,
  variant,
  onStage,
  onUnstage,
  onDiscard,
  onStageAll,
  onUnstageAll,
  onDiscardAll,
  onOpenDiff,
}: ChangesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        className="group flex h-[22px] w-full items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-vscode-fg-muted hover:bg-vscode-list-hover"
      >
        {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
        <span className="flex-1 truncate">
          {title} <span className="text-vscode-fg-dim">({entries.length})</span>
        </span>
        <span className="hidden items-center gap-0.5 group-hover:flex">
          {variant === "unstaged" && (
            <>
              <button
                type="button"
                title="丢弃全部更改"
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscardAll?.();
                }}
                className="rounded p-0.5 normal-case text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"
              >
                <IconUndo size={13} />
              </button>
              <button
                type="button"
                title="暂存全部更改"
                onClick={(e) => {
                  e.stopPropagation();
                  onStageAll?.();
                }}
                className="rounded p-0.5 normal-case text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"
              >
                <IconPlus size={13} />
              </button>
            </>
          )}
          {variant === "staged" && (
            <button
              type="button"
              title="取消暂存全部"
              onClick={(e) => {
                e.stopPropagation();
                onUnstageAll?.();
              }}
              className="rounded p-0.5 normal-case text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"
            >
              <IconMinus size={13} />
            </button>
          )}
        </span>
      </div>

      {!collapsed && (
        <div className="pb-1">
          {entries.map((entry) => (
            <FileRow
              key={entry.path}
              entry={entry}
              variant={variant}
              onStage={onStage}
              onUnstage={onUnstage}
              onDiscard={onDiscard}
              onOpenDiff={onOpenDiff}
            />
          ))}
        </div>
      )}
    </div>
  );
}
