import { useState } from "react";
import { IconChevronDown, IconChevronRight, IconMinus, IconPlus, IconUndo } from "../icons";
import FileRow from "./FileRow";
import type { FileEntry } from "./types";
import { useI18n } from "../../i18n";

interface ChangesSectionProps {
  title: string;
  titleSuffix?: string;
  titleSuffixClassName?: string;
  entries: FileEntry[];
  variant: "staged" | "unstaged" | "untracked" | "conflict";
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
  titleSuffix,
  titleSuffixClassName,
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
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className={`select-none bg-vscode-bg ${variant === "conflict" ? "mt-2" : ""}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        className="group relative flex w-full items-center gap-1 px-3 pb-1 pt-2 text-[12px] font-semibold tracking-normal text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
      >
        {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
        <span className="flex-1 truncate">
          {title} <span className="ml-1 text-vscode-fg-dim">{entries.length}</span>{titleSuffix && <span className={titleSuffixClassName}>{titleSuffix}</span>}
        </span>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setCollapsed(false); }}
          className="w-16 shrink-0 text-right text-[12px] font-medium tracking-normal text-vscode-fg-muted hover:text-vscode-fg"
        >
          查看全部
        </button>
        <span className={`absolute right-[76px] flex items-center justify-end gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 ${variant === "unstaged" ? "w-11" : "w-5"}`}>
          {(variant === "unstaged" || variant === "untracked") && (
            <>
              {variant === "unstaged" && <button type="button" title={t.git.discardAllChanges} onClick={(e) => { e.stopPropagation(); onDiscardAll?.(); }} className="rounded p-0.5 normal-case text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"><IconUndo size={13} /></button>}
              <button
                type="button"
                title={t.git.stageAllChanges}
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
              title={t.git.unstageAll}
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
        <div className="pb-2">
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
