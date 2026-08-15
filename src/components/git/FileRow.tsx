import { IconFile, IconMinus, IconPlus, IconUndo } from "../icons";
import type { FileEntry, FileStatus } from "./types";
import { useI18n } from "../../i18n";

const STATUS_META: Record<FileStatus, { label: string; color: string }> = {
  M: { label: "M", color: "text-git-modified" },
  A: { label: "A", color: "text-git-added" },
  D: { label: "D", color: "text-git-deleted" },
  R: { label: "R", color: "text-git-renamed" },
  U: { label: "U", color: "text-git-untracked" },
  "?": { label: "U", color: "text-git-untracked" },
};

function splitPath(path: string): { dir: string; name: string } {
  const idx = path.lastIndexOf("/");
  if (idx === -1) return { dir: "", name: path };
  return { dir: `${path.slice(0, idx)}/`, name: path.slice(idx + 1) };
}

interface FileRowProps {
  entry: FileEntry;
  variant: "staged" | "unstaged" | "readonly";
  selected?: boolean;
  onSelect?: (path: string) => void;
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onDiscard?: (path: string) => void;
}

export default function FileRow({
  entry,
  variant,
  selected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
}: FileRowProps) {
  const { t } = useI18n();
  const { dir, name } = splitPath(entry.path);
  const meta = STATUS_META[entry.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(entry.path)}
      title={entry.path}
      className={`group flex h-[22px] w-full items-center gap-1.5 rounded-sm px-2 text-[12.5px] ${
        selected ? "bg-vscode-list-active" : "hover:bg-vscode-list-hover"
      }`}
    >
      <IconFile size={13} className="shrink-0 text-vscode-fg-muted" />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-vscode-fg">{name}</span>
        {dir && <span className="text-vscode-fg-dim">{dir}</span>}
      </span>

      {variant === "readonly" ? (
        <span className={`shrink-0 text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
      ) : (
        <span className="relative flex shrink-0 items-center">
          <span className={`text-[11px] font-semibold group-hover:hidden ${meta.color}`}>
            {meta.label}
          </span>
          <span className="hidden items-center gap-0.5 group-hover:flex">
            {variant === "unstaged" && (
              <>
                <button
                  type="button"
                  title={t.git.discardChanges}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDiscard?.(entry.path);
                  }}
                  className="rounded p-0.5 text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"
                >
                  <IconUndo size={13} />
                </button>
                <button
                  type="button"
                  title={t.git.stageChanges}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStage?.(entry.path);
                  }}
                  className="rounded p-0.5 text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"
                >
                  <IconPlus size={13} />
                </button>
              </>
            )}
            {variant === "staged" && (
              <button
                type="button"
                title={t.git.unstage}
                onClick={(e) => {
                  e.stopPropagation();
                  onUnstage?.(entry.path);
                }}
                className="rounded p-0.5 text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"
              >
                <IconMinus size={13} />
              </button>
            )}
          </span>
        </span>
      )}
    </div>
  );
}
