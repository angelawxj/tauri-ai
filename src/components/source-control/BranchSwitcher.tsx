import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconGitBranch, IconSearch } from "../icons";
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
  const [query, setQuery] = useState("");
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
  const visibleBranches = branches.filter((branch) => branch.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  if (unavailable) {
    return (
      <span title={currentBranch} className="flex max-w-64 items-center gap-1.5 text-[12px] text-vscode-fg-muted">
        <IconGitBranch size={13} className="shrink-0" />
        <span className="truncate">{currentBranch}</span>
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={checkingOut}
        title={currentBranch}
        className="flex w-full min-w-0 items-center gap-1 rounded px-1 py-0.5 font-mono text-[13px] font-medium text-vscode-fg hover:bg-vscode-list-hover disabled:opacity-50"
      >
        <IconGitBranch size={13} className="shrink-0" />
        <span className="min-w-0 truncate">{checkingOut ? t.git.switchingBranch : currentBranch}</span>
        <IconChevronDown size={11} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-72 w-64 overflow-y-auto rounded-md border border-vscode-border-light bg-vscode-bg py-1 shadow-lg">
          {error && <div className="px-2 py-1 text-[11px] text-git-deleted">{error}</div>}
          <div className="mx-2 mb-1 flex items-center gap-1 rounded border border-vscode-input-border px-1.5 py-1">
            <IconSearch size={12} className="shrink-0 text-vscode-fg-muted" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.git.filterBranches} className="min-w-0 flex-1 bg-transparent text-[12px] text-vscode-fg outline-none placeholder:text-vscode-fg-dim" />
          </div>
          {visibleBranches.length === 0 && !error && (
            <div className="px-2 py-1 text-[11px] text-vscode-fg-dim">{t.git.noLocalBranches}</div>
          )}
          {visibleBranches.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => void handleSelect(b.name)}
              title={b.name}
              className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[12px] hover:bg-vscode-list-hover ${
                b.isHead ? "text-vscode-fg" : "text-vscode-fg-muted"
              }`}
            >
              <IconGitBranch size={12} className="shrink-0" />
              <span className="truncate font-mono">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
