import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { IconChevronDown, IconChevronRight, IconRefresh } from "../icons";
import { computeSwimlanes } from "./commit-graph";
import { useGitHistory } from "./useGitHistory";
import { useI18n } from "../../i18n";
import CommitRow from "./CommitRow";

const MIN_HEIGHT = 120;
const HEADER_HEIGHT = 26;
const DEFAULT_HEIGHT = 240;
const RESIZE_STEP = 16;

function maxHeight(): number {
  return Math.round(window.innerHeight * 0.7);
}

interface HistoryPanelProps {
  /** bump to force a re-fetch (e.g. right after a commit) */
  refreshSignal: number;
}

export default function HistoryPanel({ refreshSignal }: HistoryPanelProps) {
  const { t } = useI18n();
  const { commits, loading, error, unavailable, refresh, expanded, toggleExpanded, filesFor, isFilesLoading } =
    useGitHistory(refreshSignal);
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  const graphRows = computeSwimlanes(commits);
  const laneCount = Math.max(1, ...graphRows.map((r) => r.laneCount));

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragState.current = { startY: e.clientY, startHeight: height };

      const onMove = (ev: PointerEvent) => {
        if (!dragState.current) return;
        const delta = dragState.current.startY - ev.clientY;
        setHeight(Math.min(Math.max(dragState.current.startHeight + delta, MIN_HEIGHT), maxHeight()));
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [height],
  );

  const onHandleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHeight((h) => Math.min(h + RESIZE_STEP, maxHeight()));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHeight((h) => Math.max(h - RESIZE_STEP, MIN_HEIGHT));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHeight(MIN_HEIGHT);
    } else if (e.key === "End") {
      e.preventDefault();
      setHeight(maxHeight());
    }
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-vscode-border">
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t.git.resizeHistoryPanel}
          aria-valuenow={height}
          tabIndex={0}
          onPointerDown={onDragStart}
          onKeyDown={onHandleKeyDown}
          className="h-[3px] shrink-0 cursor-row-resize bg-transparent hover:bg-vscode-accent focus:bg-vscode-accent focus:outline-none"
        />
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        className="group flex shrink-0 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-vscode-fg-muted hover:bg-vscode-list-hover"
        style={{ height: HEADER_HEIGHT }}
      >
        {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
        <span className="flex-1 truncate">
          {t.git.commitHistoryTitle} {commits.length > 0 && <span className="text-vscode-fg-dim">({commits.length})</span>}
        </span>
        <button
          type="button"
          title={t.common.refresh}
          onClick={(e) => {
            e.stopPropagation();
            void refresh();
          }}
          className="hidden rounded p-0.5 normal-case text-vscode-fg-muted hover:bg-vscode-list-active hover:text-vscode-fg group-hover:flex"
        >
          <IconRefresh size={12} />
        </button>
      </div>

      {!collapsed && (
        <div className="overflow-y-auto" style={{ height }}>
          {unavailable && <div className="px-3 py-2 text-[11.5px] text-vscode-fg-dim">{t.git.notConnected}</div>}
          {!unavailable && error && <div className="px-3 py-2 text-[11.5px] text-git-deleted">{error}</div>}
          {!unavailable && !error && loading && (
            <div className="px-3 py-2 text-[11.5px] text-vscode-fg-dim">{t.git.loadingHistory}</div>
          )}
          {!unavailable && !error && !loading && commits.length === 0 && (
            <div className="px-3 py-2 text-[11.5px] text-vscode-fg-dim">{t.git.noCommitsYet}</div>
          )}
          {!unavailable &&
            !error &&
            commits.map((commit, i) => (
              <CommitRow
                key={commit.hash}
                commit={commit}
                graphRow={graphRows[i]}
                maxLanes={laneCount}
                isHead={i === 0}
                expanded={expanded.has(commit.hash)}
                onToggle={() => toggleExpanded(commit.hash)}
                files={filesFor(commit.hash)}
                filesLoading={isFilesLoading(commit.hash)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
