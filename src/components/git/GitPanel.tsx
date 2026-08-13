import { useMemo, useState } from "react";
import { IconGitBranch, IconRefresh } from "../icons";
import { gitApi } from "../../lib/git-api";
import { useGitStatus } from "../../hooks/useGitStatus";
import CommitBox from "./CommitBox";
import ChangesSection from "./ChangesSection";
import HistorySection from "./HistorySection";

export default function GitPanel() {
  const { status, loading, error, unavailable, refresh } = useGitStatus();
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  const staged = status?.staged ?? [];
  const unstaged = status?.unstaged ?? [];

  const disabledReason = useMemo(() => {
    if (unavailable) return "未连接 Git 后端";
    if (!message.trim()) return "请输入提交信息";
    if (staged.length === 0) return "没有已暂存的更改";
    return "";
  }, [unavailable, message, staged.length]);

  const canCommit = !unavailable && message.trim().length > 0 && staged.length > 0;

  const withErrorHandling = async (fn: () => Promise<void>) => {
    try {
      await fn();
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleCommit = async () => {
    if (!canCommit) return;
    setCommitting(true);
    await withErrorHandling(async () => {
      await gitApi.commit(message.trim());
      setMessage("");
      await refresh();
      setHistoryTick((t) => t + 1);
    });
    setCommitting(false);
  };

  const confirmDiscard = (what: string) => window.confirm(`确定要丢弃${what}吗？此操作无法撤销。`);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-vscode-border px-3">
        <span className="flex items-center gap-1.5 text-[12px] text-vscode-fg-muted">
          <IconGitBranch size={13} />
          {status?.branch ?? "—"}
        </span>
        <button
          type="button"
          title="刷新"
          onClick={() => void refresh()}
          className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
        >
          <IconRefresh size={13} />
        </button>
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
            无法连接本地 Git 后端。当前处于浏览器预览模式，请在 Tauri 应用窗口中打开以启用真实的 Git 操作。
          </div>
        )}

        {!unavailable && error && (
          <div className="px-3 py-2 text-[12px] text-git-deleted">{error}</div>
        )}

        {!unavailable && actionError && (
          <div className="px-3 py-2 text-[12px] text-git-deleted">{actionError}</div>
        )}

        {!unavailable && !error && !loading && staged.length === 0 && unstaged.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-vscode-fg-dim">没有检测到更改</div>
        )}

        {!unavailable && !error && (
          <>
            <ChangesSection
              title="暂存的更改"
              entries={staged}
              variant="staged"
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              onUnstage={(path) => void withErrorHandling(async () => {
                await gitApi.unstage(path);
                await refresh();
              })}
              onUnstageAll={() => void withErrorHandling(async () => {
                await gitApi.unstageAll();
                await refresh();
              })}
            />
            <ChangesSection
              title="更改"
              entries={unstaged}
              variant="unstaged"
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              onStage={(path) => void withErrorHandling(async () => {
                await gitApi.stage(path);
                await refresh();
              })}
              onStageAll={() => void withErrorHandling(async () => {
                await gitApi.stageAll();
                await refresh();
              })}
              onDiscard={(path) => {
                if (!confirmDiscard(`「${path}」的更改`)) return;
                void withErrorHandling(async () => {
                  await gitApi.discard(path);
                  await refresh();
                });
              }}
              onDiscardAll={() => {
                if (!confirmDiscard("全部未暂存的更改")) return;
                void withErrorHandling(async () => {
                  await Promise.all(unstaged.map((f) => gitApi.discard(f.path)));
                  await refresh();
                });
              }}
            />
          </>
        )}

        <HistorySection refreshSignal={historyTick} />
      </div>
    </div>
  );
}
