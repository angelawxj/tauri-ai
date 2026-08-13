import { useState } from "react";
import TabBar, { type TabDef } from "./TabBar";
import GitPanel from "../git/GitPanel";

const TABS: TabDef[] = [
  { id: "git", label: "Git 管理" },
  { id: "files", label: "文件", disabled: true },
  { id: "terminal", label: "终端", disabled: true },
];

export default function DetailPanel() {
  const [activeId, setActiveId] = useState("git");

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-vscode-border bg-vscode-panel">
      <TabBar tabs={TABS} activeId={activeId} onChange={setActiveId} />
      <div className="min-h-0 flex-1">{activeId === "git" && <GitPanel />}</div>
    </aside>
  );
}
