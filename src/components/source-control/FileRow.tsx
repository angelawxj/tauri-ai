import { IconCommitFile, IconMinus, IconPlus, IconUndo } from "../icons";
import { STATUS_COLOR_CLASS, STATUS_LABELS } from "./status";
import type { FileEntry } from "./types";
import { useI18n } from "../../i18n";

function splitPath(path: string): { dir: string; name: string } {
  const idx = path.lastIndexOf("/");
  if (idx === -1) return { dir: "", name: path };
  return { dir: `${path.slice(0, idx)}/`, name: path.slice(idx + 1) };
}

interface FileRowProps {
  entry: FileEntry;
  variant: "staged" | "unstaged" | "untracked" | "readonly";
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onDiscard?: (path: string) => void;
  /** 点击文件行时触发，在中间区域打开一个 diff 标签页 */
  onOpenDiff?: (path: string, staged: boolean) => void;
}

export default function FileRow({
  entry,
  variant,
  onStage,
  onUnstage,
  onDiscard,
  onOpenDiff,
}: FileRowProps) {
  const { t } = useI18n();
  const { dir, name } = splitPath(entry.path);
  const colorClass = STATUS_COLOR_CLASS[entry.status];
  const label = STATUS_LABELS[entry.status];
  const canOpenDiff = variant !== "readonly";

  const handleClick = () => {
    if (!canOpenDiff) return;
    onOpenDiff?.(entry.path, variant === "staged");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      title={entry.path}
      className={`group flex h-[23px] w-full items-center gap-1.5 px-3 text-[12px] transition-colors ${
        canOpenDiff ? "cursor-pointer hover:bg-vscode-list-hover" : ""
      }`}
    >
      <IconCommitFile size={14} className={`shrink-0 ${colorClass}`} />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-vscode-fg">{name}</span>
        {dir && <span className="ml-1.5 text-[11px] text-vscode-fg-dim">{dir}</span>}
      </span>

      {variant === "readonly" ? (
        <span className={`shrink-0 text-[11px] font-semibold ${colorClass}`}>{label}</span>
      ) : (
        <span className="relative flex h-5 w-10 shrink-0 items-center justify-end">
          <span className={`absolute right-0 text-[11px] font-semibold transition-opacity group-hover:opacity-0 ${colorClass}`}>{label}</span>
          <span className="absolute right-0 flex items-center gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            {(variant === "unstaged" || variant === "untracked") && (
              <>
                {variant === "unstaged" && <button type="button" title={t.git.discardChanges} onClick={(e) => { e.stopPropagation(); onDiscard?.(entry.path); }} className="rounded p-0.5 text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg"><IconUndo size={13} /></button>}
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
