import { useEffect, useState } from "react";
import { IconChevronDown, IconChevronRight } from "../icons";
import { api } from "./api";
import FileRow from "./FileRow";
import type { FileEntry } from "./types";

interface CommittedChangesSectionProps {
  title: string;
  refreshSignal: number;
}

/** Orca's branch-relative committed-file section; distinct from commit history. */
export default function CommittedChangesSection({ title, refreshSignal }: CommittedChangesSectionProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [files, setFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.committedFiles().then((entries) => { if (!cancelled) setFiles(entries); }).catch(() => { if (!cancelled) setFiles([]); });
    return () => { cancelled = true; };
  }, [refreshSignal]);

  if (files.length === 0) return null;
  return (
    <div className="select-none bg-vscode-bg">
      <div role="button" tabIndex={0} onClick={() => setCollapsed((value) => !value)} className="group flex w-full items-center gap-1 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg">
        {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
        <span className="flex-1 truncate">{title} <span className="ml-1 text-vscode-fg-dim">{files.length}</span></span>
        <button type="button" onClick={(event) => { event.stopPropagation(); setCollapsed(false); }} className="mr-1 shrink-0 normal-case text-[11px] font-medium tracking-normal text-vscode-fg-muted hover:text-vscode-fg">查看全部</button>
      </div>
      {!collapsed && <div className="pb-2">{files.map((file) => <FileRow key={file.path} entry={file} variant="readonly" />)}</div>}
    </div>
  );
}
