import type { KeyboardEvent } from "react";
import { IconCheck, IconPlus } from "../icons";
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
}: CommitBoxProps) {
  const { t } = useI18n();
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit || committing}
        title={canCommit ? actionTitle ?? t.git.commitTitle : disabledReason}
        className="flex items-center justify-center gap-1.5 rounded-md bg-vscode-button px-3 py-1.5 text-xs font-medium text-vscode-button-fg enabled:hover:bg-vscode-button-hover disabled:cursor-not-allowed disabled:opacity-45"
      >
        {actionLabel ? <IconPlus size={13} /> : <IconCheck size={13} />}
        {committing ? t.git.committing : actionLabel ?? t.git.commit}
      </button>
    </div>
  );
}
