import { useMemo, useState } from "react";
import { IconRefresh, IconUpload } from "../icons";
import { api } from "./api";
import { useGitStatus } from "./useGitStatus";
import { useI18n } from "../../i18n";
import BranchSwitcher from "./BranchSwitcher";
import CommitBox from "./CommitBox";
import ChangesSection from "./ChangesSection";
import HistoryPanel from "./HistoryPanel";

interface SourceControlProps {
  onOpenDiff?: (path: string, staged: boolean) => void;
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

  const staged = status?.staged ?? [];
  const unstaged = status?.unstaged ?? [];

  const disabledReason = useMemo(() => {
    if (unavailable) return t.git.notConnected;
    if (!message.trim()) return t.git.enterCommitMessage;
    if (staged.length === 0) return t.git.noStagedChanges;
    return "";
  }, [unavailable, message, staged.length, t]);

  const canCommit = !unavailable && message.trim().length > 0 && staged.length > 0;

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
    if (!window.confirm(t.git.confirmPush(status.branch))) return;
    setPushing(true);
    await withErrorHandling(async () => {
      await api.push(status.branch);
      setActionMessage(t.git.pushedTo(status.branch));
    });
    setPushing(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-vscode-border px-3">
        <BranchSwitcher currentBranch={status?.branch ?? "—"} onCheckedOut={handleBranchSwitched} />
        <div className="flex items-center gap-0.5">
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
        <CommitBox
          message={message}
          onMessageChange={setMessage}
          onCommit={() => void handleCommit()}
          canCommit={canCommit}
          disabledReason={disabledReason}
          committing={committing}
        />

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

        {!unavailable && !error && !loading && staged.length === 0 && unstaged.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-vscode-fg-dim">{t.git.noChangesDetected}</div>
        )}

        {!unavailable && !error && (
          <>
            <ChangesSection
              title={t.git.stagedChangesTitle}
              entries={staged}
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
              entries={unstaged}
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
          </>
        )}
      </div>

        <HistoryPanel refreshSignal={historyTick} currentBranch={status?.branch} />
    </div>
  );
}
