import type { KeyboardEvent } from "react";
import { IconCheck } from "../icons";

interface CommitBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onCommit: () => void;
  canCommit: boolean;
  disabledReason: string;
  committing: boolean;
}

export default function CommitBox({
  message,
  onMessageChange,
  onCommit,
  canCommit,
  disabledReason,
  committing,
}: CommitBoxProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canCommit) onCommit();
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-vscode-border px-3 py-2.5">
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="提交消息 (Ctrl+Enter 提交)"
        rows={3}
        className="w-full resize-none rounded-sm border border-vscode-input-border bg-vscode-input-bg px-2 py-1.5 text-[12.5px] text-vscode-fg placeholder:text-vscode-fg-dim focus:border-vscode-accent focus:outline-none"
      />
      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit || committing}
        title={canCommit ? "提交 (Ctrl+Enter)" : disabledReason}
        className="flex items-center justify-center gap-1.5 rounded-sm bg-vscode-button px-3 py-1.5 text-[12.5px] font-medium text-vscode-button-fg enabled:hover:bg-vscode-button-hover disabled:cursor-not-allowed disabled:opacity-45"
      >
        <IconCheck size={13} />
        {committing ? "提交中…" : "提交"}
      </button>
    </div>
  );
}
