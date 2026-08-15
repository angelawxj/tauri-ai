import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconGitBranch } from "../icons";
import { useBranches } from "./useBranches";
import { useI18n } from "../../i18n";

interface BranchSwitcherProps {
  currentBranch: string;
  onCheckedOut: () => void;
}

export default function BranchSwitcher({ currentBranch, onCheckedOut }: BranchSwitcherProps) {
  const { t } = useI18n();
  const { branches, unavailable, checkout, checkingOut, error } = useBranches();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleSelect = async (name: string) => {
    if (name === currentBranch) {
      setOpen(false);
      return;
    }
    try {
      await checkout(name);
      setOpen(false);
      onCheckedOut();
    } catch {
      // 错误信息已经保存在 useBranches 的 error 里，在下拉框内展示，不自动关闭
    }
  };

  if (unavailable) {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-vscode-fg-muted">
        <IconGitBranch size={13} />
        {currentBranch}
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={checkingOut}
        className="flex items-center gap-1 rounded px-1 py-0.5 text-[12px] text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg disabled:opacity-50"
      >
        <IconGitBranch size={13} />
        {checkingOut ? t.git.switchingBranch : currentBranch}
        <IconChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-64 w-48 overflow-y-auto rounded-sm border border-vscode-border-light bg-vscode-panel-header py-1 shadow-lg">
          {error && <div className="px-2 py-1 text-[11px] text-git-deleted">{error}</div>}
          {branches.length === 0 && !error && (
            <div className="px-2 py-1 text-[11px] text-vscode-fg-dim">{t.git.noLocalBranches}</div>
          )}
          {branches.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => void handleSelect(b.name)}
              className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-[12px] hover:bg-vscode-list-hover ${
                b.isHead ? "text-vscode-fg" : "text-vscode-fg-muted"
              }`}
            >
              <IconGitBranch size={12} className="shrink-0" />
              <span className="truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
