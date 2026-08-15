import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown, IconPlus, IconUpload } from "../icons";
import { useI18n } from "../../i18n";

interface CommitBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onCommit: () => void;
  canCommit: boolean;
  disabledReason: string;
  committing: boolean;
  actionLabel?: string;
  actionTitle?: string;
  actionKind?: "commit" | "stage" | "publish";
  onPush?: () => void;
  canPush?: boolean;
  onStageAll?: () => void;
  canStageAll?: boolean;
  onFetch?: () => void;
  onPull?: () => void;
  onForcePush?: () => void;
  onSync?: () => void;
  onRebaseMain?: () => void;
  onCommitAndPush?: () => void;
}

export default function CommitBox({
  message,
  onMessageChange,
  onCommit,
  canCommit,
  disabledReason,
  committing,
  actionLabel,
  actionTitle,
  actionKind = "commit",
  onPush,
  canPush = false,
  onStageAll,
  canStageAll = false,
  onFetch,
  onPull,
  onForcePush,
  onSync,
  onRebaseMain,
  onCommitAndPush,
}: CommitBoxProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasMoreActions = Boolean(onPush || onStageAll);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideInteraction = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setMenuOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canCommit) onCommit();
    }
  };

  return (
    <div className="flex flex-col gap-1.5 border-b border-vscode-border bg-vscode-bg px-3 pb-2 pt-1.5">
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t.git.commitPlaceholder}
        rows={3}
        className="min-h-14 w-full resize-none rounded-md border border-vscode-input-border bg-vscode-input-bg px-2 py-1.5 text-xs text-vscode-fg shadow-sm placeholder:text-vscode-fg-dim focus:border-vscode-accent focus:outline-none"
      />
      <div className="relative flex items-stretch">
        <button type="button" onClick={onCommit} disabled={!canCommit || committing} title={canCommit ? actionTitle ?? t.git.commitTitle : disabledReason} className={`flex flex-1 items-center justify-center gap-1.5 border px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45 ${hasMoreActions ? "rounded-l-md border-vscode-button bg-vscode-button text-vscode-button-fg hover:bg-vscode-button-hover" : "rounded-md border-vscode-button bg-vscode-button text-vscode-button-fg hover:bg-vscode-button-hover"}`}>
          {actionKind === "publish" ? <IconUpload size={13} /> : actionKind === "stage" ? <IconPlus size={13} /> : <IconCheck size={13} />}
          {committing ? t.git.committing : actionLabel ?? t.git.commit}
        </button>
        {hasMoreActions && <button ref={menuButtonRef} type="button" aria-label={t.git.moreCommitActions} title={t.git.moreCommitActions} onClick={() => {
          const rect = menuButtonRef.current?.getBoundingClientRect();
          if (rect) setMenuPosition({ left: Math.max(8, Math.min(rect.right - 240, window.innerWidth - 248)), top: rect.bottom + 4 });
          setMenuOpen((open) => !open);
        }} className="w-10 rounded-r-md border border-vscode-button bg-vscode-button px-2 text-vscode-button-fg hover:bg-vscode-button-hover"><IconChevronDown size={13} /></button>}
      </div>
      {menuOpen && menuPosition && createPortal(
        <div ref={menuRef} role="menu" className="fixed z-[100] min-w-60 rounded-md border border-vscode-border-light bg-vscode-bg py-1 shadow-xl" style={menuPosition}>
          <button type="button" disabled={!canCommit} onClick={() => { setMenuOpen(false); onCommit(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover disabled:cursor-not-allowed disabled:opacity-45">{t.git.commit}</button>
          <button type="button" disabled={!canCommit || !onCommitAndPush} onClick={() => { setMenuOpen(false); onCommitAndPush?.(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover disabled:cursor-not-allowed disabled:opacity-45">{t.git.commitAndPush}</button>
          <div className="my-1 border-t border-vscode-border" />
          {canPush && onPush && <button type="button" onClick={() => { setMenuOpen(false); onPush(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.push}</button>}
          {canPush && onForcePush && <button type="button" onClick={() => { setMenuOpen(false); onForcePush(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-git-deleted hover:bg-vscode-list-hover">{t.git.forcePush}</button>}
          {onPull && <button type="button" onClick={() => { setMenuOpen(false); onPull(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.pull}</button>}
          {onPull && <button type="button" onClick={() => { setMenuOpen(false); onPull(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.fastForward}</button>}
          {onSync && <button type="button" onClick={() => { setMenuOpen(false); onSync(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.sync}</button>}
          {onRebaseMain && <button type="button" onClick={() => { setMenuOpen(false); onRebaseMain(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.rebaseMain}</button>}
          {onFetch && <button type="button" onClick={() => { setMenuOpen(false); onFetch(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.fetch}</button>}
          {canStageAll && onStageAll && <button type="button" onClick={() => { setMenuOpen(false); onStageAll(); }} className="flex w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">{t.git.stageAllChanges}</button>}
        </div>,
        document.body,
      )}
    </div>
  );
}
