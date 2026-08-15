import { useEffect, useMemo, useRef, useState } from "react";
import { IconGitMerge, IconRefresh, IconSearch, IconSparkle, IconUpload, IconX } from "../icons";
import { api } from "./api";
import { useGitStatus } from "./useGitStatus";
import { useI18n } from "../../i18n";
import BranchSwitcher from "./BranchSwitcher";
import CommitBox from "./CommitBox";
import ChangesSection from "./ChangesSection";
import HistoryPanel from "./HistoryPanel";
import CommittedChangesSection from "./CommittedChangesSection";
import type { FileEntry } from "./types";

interface SourceControlProps {
  onOpenDiff?: (path: string, staged: boolean, commitHash?: string) => void;
}

export default function SourceControl({ onOpenDiff }: SourceControlProps) {
  const { t } = useI18n();
  const { status, loading, error, unavailable, refresh } = useGitStatus();
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [pushing, setPushing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [hasOutgoingChanges, setHasOutgoingChanges] = useState(false);
  const [baseRefName, setBaseRefName] = useState<string | undefined>(undefined);
  const [committedFiles, setCommittedFiles] = useState<FileEntry[]>([]);
  const observedHeadRef = useRef<string | null | undefined>(undefined);

  const staged = status?.staged ?? [];
  const conflicts = (status?.unstaged ?? []).filter((entry) => entry.status === "C");
  const unstaged = (status?.unstaged ?? []).filter((entry) => entry.status !== "U" && entry.status !== "C");
  const untracked = (status?.unstaged ?? []).filter((entry) => entry.status === "U");
  const matchesFilter = (path: string) => path.toLocaleLowerCase().includes(filterQuery.trim().toLocaleLowerCase());
  const filteredStaged = staged.filter((entry) => matchesFilter(entry.path));
  const filteredUnstaged = unstaged.filter((entry) => matchesFilter(entry.path));
  const filteredUntracked = untracked.filter((entry) => matchesFilter(entry.path));
  const filteredConflicts = conflicts.filter((entry) => matchesFilter(entry.path));

  const disabledReason = useMemo(() => {
    if (unavailable) return t.git.notConnected;
    if (!message.trim()) return t.git.enterCommitMessage;
    if (staged.length === 0) return t.git.noStagedChanges;
    return "";
  }, [unavailable, message, staged.length, t]);

  const canCommit = !unavailable && conflicts.length === 0 && message.trim().length > 0 && staged.length > 0;
  const canStageAll = !unavailable && conflicts.length === 0 && staged.length === 0 && (unstaged.length > 0 || untracked.length > 0);
  const canPushIdle = !unavailable && conflicts.length === 0 && hasOutgoingChanges && Boolean(status?.branch) && staged.length === 0 && unstaged.length === 0 && untracked.length === 0;
  // Match Orca: hide the composer only for the true empty state. A branch can
  // be clean locally but still have committed branch changes to review.
  const showGenericEmptyState = !unavailable && !error && !loading && conflicts.length === 0 && staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && committedFiles.length === 0;

  const refreshOutgoingStatus = async () => {
    try {
      const context = await api.historyContext();
      setHasOutgoingChanges(context.hasOutgoingChanges);
      // When HEAD already equals its upstream there is no merge-base lane, but
      // Orca still names that upstream in the clean-branch empty state.
      setBaseRefName(context.baseRef?.name ?? context.remoteRef?.name);
    } catch {
      setHasOutgoingChanges(false);
      setBaseRefName(undefined);
    }
  };

  useEffect(() => {
    void refreshOutgoingStatus();
  }, [status]);

  useEffect(() => {
    const head = status?.head;
    if (!head) return;
    if (observedHeadRef.current && observedHeadRef.current !== head) {
      setHistoryTick((tick) => tick + 1);
    }
    observedHeadRef.current = head;
  }, [status?.head]);

  // This is a branch comparison (base..HEAD), not a history cache.  A commit,
  // push, pull, or an external Git client can change HEAD while the branch name
  // stays the same, so key this request off the status snapshot itself.
  useEffect(() => {
    let cancelled = false;
    api.committedFiles().then((entries) => { if (!cancelled) setCommittedFiles(entries); }).catch(() => { if (!cancelled) setCommittedFiles([]); });
    return () => { cancelled = true; };
  }, [status]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = window.setTimeout(() => setActionMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  const withErrorHandling = async (fn: () => Promise<void>) => {
    setActionMessage(null);
    try {
      await fn();
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.git.actionFailed);
    }
  };

  const handleCommit = async () => {
    if (!canCommit) return;
    setCommitting(true);
    await withErrorHandling(async () => {
      await api.commit(message.trim());
      setMessage("");
      await refresh();
      await refreshOutgoingStatus();
      setHistoryTick((t) => t + 1);
    });
    setCommitting(false);
  };

  const confirmDiscard = (what: string) => window.confirm(t.git.confirmDiscard(what));

  const handleBranchSwitched = () => {
    void refresh();
    setHistoryTick((t) => t + 1);
  };

  const handlePush = async () => {
    if (!status?.branch || pushing) return;
    setPushing(true);
    await withErrorHandling(async () => {
      await api.push(status.branch);
      setActionMessage(t.git.pushedTo(status.branch));
      await refresh();
      await refreshOutgoingStatus();
      setHistoryTick((t) => t + 1);
    });
    setPushing(false);
  };

  const handleCommitAndPush = async () => {
    if (!canCommit || !status?.branch) return;
    setCommitting(true);
    await withErrorHandling(async () => {
      await api.commit(message.trim());
      await api.push(status.branch);
      setMessage("");
      await refresh();
      await refreshOutgoingStatus();
      setHistoryTick((t) => t + 1);
    });
    setCommitting(false);
  };
  const runRemoteAction = async (action: () => Promise<unknown>) => {
    await withErrorHandling(async () => { await action(); await refresh(); await refreshOutgoingStatus(); setHistoryTick((tick) => tick + 1); });
  };
  const handleForcePush = () => {
    if (!status?.branch || !window.confirm(t.git.confirmForcePush(status.branch))) return;
    void runRemoteAction(() => api.forcePush(status.branch));
  };
  const handleRebaseMain = () => {
    if (!window.confirm(t.git.confirmRebaseMain)) return;
    void runRemoteAction(() => api.rebaseMain());
  };
  const handleAbortMerge = () => {
    if (!window.confirm("确定要中止当前合并吗？未提交的合并结果将被撤销。")) return;
    void runRemoteAction(() => api.abortMerge());
  };
  const handleOpenFirstConflict = () => {
    const firstConflict = conflicts[0];
    if (firstConflict) onOpenDiff?.(firstConflict.path, false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-vscode-bg">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-vscode-border bg-vscode-bg px-3">
        {filterOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <IconSearch size={14} className="shrink-0 text-vscode-fg-muted" />
            <input autoFocus value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder={t.git.filterFiles} className="min-w-0 flex-1 bg-transparent text-[13px] text-vscode-fg outline-none placeholder:text-vscode-fg-dim" />
            <button type="button" title={t.common.close} onClick={() => { setFilterOpen(false); setFilterQuery(""); }} className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"><IconX size={13} /></button>
          </div>
        ) : <div className="flex min-w-0 flex-1 items-center gap-2"><span title={status?.repoPath} className="max-w-28 shrink-0 truncate font-mono text-[13px] font-medium text-vscode-fg" >{status?.repoName ?? "repository"}</span><span className="h-4 shrink-0 w-px bg-vscode-border" /><BranchSwitcher currentBranch={status?.branch ?? "—"} onCheckedOut={handleBranchSwitched} /></div>}
        <div className="flex items-center gap-0.5">
          {!filterOpen && <button type="button" title={t.git.filterFiles} onClick={() => setFilterOpen(true)} className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"><IconSearch size={13} /></button>}
          <button
            type="button"
            title={t.git.push}
            onClick={() => void handlePush()}
            disabled={unavailable || !status?.branch || pushing}
            className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconUpload size={13} />
          </button>
          <button
            type="button"
            title={t.common.refresh}
            onClick={() => void refresh()}
            className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
          >
            <IconRefresh size={13} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conflicts.length > 0 && (
          <div className="mx-3 mt-2 rounded-md border border-[#f59e0b]/25 bg-[#f59e0b]/5 px-3 py-2 text-vscode-fg">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[16px] leading-none text-conflict-amber">⚠</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">Merge conflicts: {conflicts.length} 未解决</div>
                <p className="mt-1 text-[11px] text-vscode-fg-muted">已解决的文件在离开实时冲突状态后会恢复正常更改。</p>
              </div>
            </div>
            <div className="mt-2">
              <button type="button" disabled title="当前未配置 AI 冲突解决能力" className="flex h-7 w-full items-center justify-center gap-1 rounded-md bg-[#1d1d1f] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-90"><IconSparkle size={12} /> 用AI解决</button>
              <button type="button" onClick={handleOpenFirstConflict} className="mt-1.5 flex h-7 w-full items-center justify-center gap-1 rounded-md border border-vscode-border-light bg-vscode-bg px-3 text-xs text-vscode-fg hover:bg-vscode-list-hover"><IconGitMerge size={13} /> 评审冲突</button>
              <button type="button" onClick={handleAbortMerge} className="mt-1.5 flex h-7 w-full items-center justify-center rounded-md border border-vscode-border-light bg-vscode-bg px-3 text-xs text-vscode-fg hover:bg-vscode-list-hover">中止合并</button>
            </div>
          </div>
        )}
        {conflicts.length === 0 && <CommitBox
          message={message}
          onMessageChange={setMessage}
          showMessage={!showGenericEmptyState}
          onCommit={() => {
            if (canStageAll) {
              void withErrorHandling(async () => { await api.stageAll(); await refresh(); });
            } else if (canPushIdle) {
              void handlePush();
            } else {
              void handleCommit();
            }
          }}
          canCommit={canCommit || canStageAll || canPushIdle}
          disabledReason={canStageAll || canPushIdle ? "" : disabledReason}
          committing={committing || pushing}
          actionLabel={canPushIdle ? t.git.pushShort : canStageAll ? t.git.stageAllShort : undefined}
          actionTitle={canPushIdle ? t.git.push : canStageAll ? t.git.stageAllChanges : undefined}
          actionKind={canPushIdle ? "publish" : canStageAll ? "stage" : "commit"}
          onPush={() => void handlePush()}
          canPush={!unavailable && Boolean(status?.branch)}
          onStageAll={() => void withErrorHandling(async () => { await api.stageAll(); await refresh(); })}
          canStageAll={canStageAll}
          onFetch={() => void runRemoteAction(() => api.fetch())}
          onPull={() => void runRemoteAction(() => api.pull())}
          onForcePush={handleForcePush}
          onSync={() => void runRemoteAction(async () => { await api.pull(); if (status?.branch) await api.push(status.branch); })}
          onRebaseMain={handleRebaseMain}
          onCommitAndPush={() => void handleCommitAndPush()}
        />}

        {unavailable && (
          <div className="px-3 py-3 text-[12px] leading-relaxed text-vscode-fg-dim">
            {t.git.browserPreviewNotice}
          </div>
        )}

        {!unavailable && error && <div className="px-3 py-2 text-[12px] text-git-deleted">{error}</div>}
        {!unavailable && actionError && (
          <div className="px-3 py-2 text-[12px] text-git-deleted">{actionError}</div>
        )}
        {!unavailable && !actionError && actionMessage && (
          <div className="px-3 py-2 text-[12px] text-git-added">{actionMessage}</div>
        )}

        {showGenericEmptyState && (
          <div className="px-4 py-6">
            <div className="text-sm font-medium text-vscode-fg">{t.git.noChangesHeading}</div>
            <div className="mt-1 text-[12px] text-vscode-fg-dim">{t.git.noChangesSupportingText(baseRefName ?? t.git.baseRefFallback)}</div>
          </div>
        )}

        {!unavailable && !error && (
          <>
            <ChangesSection
              title="冲突"
              titleSuffix={` · ${conflicts.length} 冲突`}
              titleSuffixClassName="ml-1 font-normal text-git-conflict"
              entries={filteredConflicts}
              variant="conflict"
              onOpenDiff={onOpenDiff}
            />
            <ChangesSection
              title={t.git.stagedChangesTitle}
              entries={filteredStaged}
              variant="staged"
              onUnstage={(path) =>
                void withErrorHandling(async () => {
                  await api.unstage(path);
                  await refresh();
                })
              }
              onUnstageAll={() =>
                void withErrorHandling(async () => {
                  await api.unstageAll();
                  await refresh();
                })
              }
              onOpenDiff={onOpenDiff}
            />
            <ChangesSection
              title={t.git.changesTitle}
              entries={filteredUnstaged}
              variant="unstaged"
              onStage={(path) =>
                void withErrorHandling(async () => {
                  await api.stage(path);
                  await refresh();
                })
              }
              onStageAll={() =>
                void withErrorHandling(async () => {
                  await api.stageAll();
                  await refresh();
                })
              }
              onDiscard={(path) => {
                if (!confirmDiscard(t.git.changesToPath(path))) return;
                void withErrorHandling(async () => {
                  await api.discard(path);
                  await refresh();
                });
              }}
              onDiscardAll={() => {
                if (!confirmDiscard(t.git.allUnstagedChanges)) return;
                void withErrorHandling(async () => {
                  await Promise.all(unstaged.map((f) => api.discard(f.path)));
                  await refresh();
                });
              }}
              onOpenDiff={onOpenDiff}
            />
            <ChangesSection
              title={t.git.untrackedFilesTitle}
              entries={filteredUntracked}
              variant="untracked"
              onStage={(path) => void withErrorHandling(async () => { await api.stage(path); await refresh(); })}
              onStageAll={() => void withErrorHandling(async () => { await api.stageAll(); await refresh(); })}
              onOpenDiff={onOpenDiff}
            />
            <CommittedChangesSection title={t.git.committedChangesTitle} files={committedFiles} filterQuery={filterQuery} />
          </>
        )}
      </div>

      <HistoryPanel refreshSignal={historyTick} onOpenCommitFile={(hash, path) => onOpenDiff?.(path, false, hash)} />
    </div>
  );
}
