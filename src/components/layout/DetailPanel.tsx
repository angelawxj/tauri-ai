import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import TabBar, { type TabDef } from "./TabBar";
import { GitPanel } from "../git";
import { SourceControl } from "../source-control";

interface DetailPanelProps {
  onOpenDiff?: (path: string, staged: boolean) => void;
}

const TABS: TabDef[] = [
  { id: "git", label: "Git 管理" },
  { id: "source-control", label: "Source Control" },
  { id: "files", label: "文件", disabled: true },
  { id: "terminal", label: "终端", disabled: true },
];

const WIDTH_STORAGE_KEY = "detailPanelWidth";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;

function readStoredWidth(): number {
  const raw = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_WIDTH;
  return Math.min(Math.max(raw, MIN_WIDTH), MAX_WIDTH);
}

export default function DetailPanel({ onOpenDiff }: DetailPanelProps) {
  const [activeId, setActiveId] = useState("git");
  const [width, setWidth] = useState(readStoredWidth);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }, [width]);

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragState.current = { startX: e.clientX, startWidth: width };

      const onMove = (ev: PointerEvent) => {
        if (!dragState.current) return;
        // 手柄在面板左边缘：鼠标左移(负值)意味着面板变宽
        const delta = dragState.current.startX - ev.clientX;
        setWidth(Math.min(Math.max(dragState.current.startWidth + delta, MIN_WIDTH), MAX_WIDTH));
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width],
  );

  return (
    <aside className="flex h-full shrink-0" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整右侧面板宽度"
        tabIndex={0}
        onPointerDown={onDragStart}
        className="h-full w-[3px] shrink-0 cursor-col-resize bg-transparent hover:bg-vscode-accent focus:bg-vscode-accent focus:outline-none"
      />
      <div className="flex h-full min-w-0 flex-1 flex-col border-l border-vscode-border bg-vscode-panel">
        <TabBar tabs={TABS} activeId={activeId} onChange={setActiveId} />
        <div className="min-h-0 flex-1">
          {activeId === "git" && <GitPanel />}
          {activeId === "source-control" && <SourceControl onOpenDiff={onOpenDiff} />}
        </div>
      </div>
    </aside>
  );
}
