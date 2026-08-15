import { useCallback, useEffect, useMemo, useState } from "react";
import { IconChevronDown, IconChevronRight, IconRefresh } from "../icons";
import { gitApi, isGitApiUnavailable } from "./api";
import { computeCommitGraph } from "./commit-graph";
import type { CommitInfo, FileEntry } from "./types";
import { useI18n } from "../../i18n";
import CommitRow from "./CommitRow";

interface HistorySectionProps {
  /** bump this number to force a re-fetch (e.g. right after a commit) */
  refreshSignal: number;
}

export default function HistorySection({ refreshSignal }: HistorySectionProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fileCache, setFileCache] = useState<Record<string, FileEntry[]>>({});
  const [filesLoading, setFilesLoading] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const log = await gitApi.log(50);
      setCommits(log);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      if (isGitApiUnavailable(err)) {
        setUnavailable(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : t.git.loadHistoryFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshSignal]);

  const graphRows = useMemo(() => computeCommitGraph(commits), [commits]);
  const maxLanes = useMemo(
    () => Math.max(1, ...graphRows.map((r) => r.laneCount)),
    [graphRows],
  );

  const toggle = (hash: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });

    if (!fileCache[hash] && !filesLoading.has(hash)) {
      setFilesLoading((prev) => new Set(prev).add(hash));
      gitApi
        .commitFiles(hash)
        .then((files) => {
          setFileCache((prev) => ({ ...prev, [hash]: files }));
        })
        .catch(() => {
          setFileCache((prev) => ({ ...prev, [hash]: [] }));
        })
        .finally(() => {
          setFilesLoading((prev) => {
            const next = new Set(prev);
            next.delete(hash);
            return next;
          });
        });
    }
  };

  return (
    <div className="select-none border-t border-vscode-border">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        className="group flex h-[26px] w-full items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-vscode-fg-muted hover:bg-vscode-list-hover"
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
        <div className="max-h-[420px] overflow-y-auto pb-1">
          {unavailable && (
            <div className="px-3 py-2 text-[11.5px] text-vscode-fg-dim">{t.git.notConnected}</div>
          )}
          {!unavailable && error && (
            <div className="px-3 py-2 text-[11.5px] text-git-deleted">{error}</div>
          )}
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
                maxLanes={maxLanes}
                isHead={i === 0}
                expanded={expanded.has(commit.hash)}
                onToggle={() => toggle(commit.hash)}
                files={fileCache[commit.hash]}
                filesLoading={filesLoading.has(commit.hash)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
