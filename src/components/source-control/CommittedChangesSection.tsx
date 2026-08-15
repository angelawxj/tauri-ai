import { useState } from "react";
import { IconChevronDown, IconChevronRight } from "../icons";
import FileRow from "./FileRow";
import type { FileEntry } from "./types";

interface CommittedChangesSectionProps {
  title: string;
  files: FileEntry[];
  filterQuery?: string;
}

/** Orca's branch-relative committed-file section; distinct from commit history. */
export default function CommittedChangesSection({ title, files, filterQuery = "" }: CommittedChangesSectionProps) {
  const [collapsed, setCollapsed] = useState(true);

  const visibleFiles = files.filter((file) => file.path.toLocaleLowerCase().includes(filterQuery.toLocaleLowerCase()));
  if (files.length === 0 || (filterQuery && visibleFiles.length === 0)) return null;
  return (
    <div className="select-none bg-vscode-bg">
      <div role="button" tabIndex={0} onClick={() => setCollapsed((value) => !value)} className="group flex w-full items-center gap-1 px-3 pb-1 pt-2 text-[12px] font-semibold tracking-normal text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg">
        {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
        <span className="flex-1 truncate">{title} <span className="ml-1 text-vscode-fg-dim">{visibleFiles.length}</span></span>
        <button type="button" onClick={(event) => { event.stopPropagation(); setCollapsed(false); }} className="w-16 shrink-0 text-right text-[12px] font-medium tracking-normal text-vscode-fg-muted hover:text-vscode-fg">查看全部</button>
      </div>
      {!collapsed && <div className="pb-2">{visibleFiles.map((file) => <FileRow key={file.path} entry={file} variant="readonly" />)}</div>}
    </div>
  );
}
