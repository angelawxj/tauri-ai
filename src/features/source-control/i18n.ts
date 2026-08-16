import { useEffect, useState } from "react";

/** Source Control owns its strings; the host only supplies the active language. */
export type SourceControlLanguage = "zh" | "en";

const zh = {
  common: { refresh: "刷新", close: "关闭", unknownError: "未知错误" },
  git: {
    notConnected: "未连接 Git 后端", enterCommitMessage: "请输入提交信息", noStagedChanges: "没有已暂存的更改", actionFailed: "操作失败",
    browserPreviewNotice: "无法连接本地 Git 后端。当前处于浏览器预览模式，请在 Tauri 应用窗口中打开以启用真实的 Git 操作。",
    noChangesHeading: "No changes on this branch", noChangesSupportingText: (baseRef: string) => `This workspace is clean and this branch has no changes ahead of ${baseRef}`, baseRefFallback: "基准分支",
    stagedChangesTitle: "暂存的更改", changesTitle: "更改", untrackedFilesTitle: "未跟踪文件", committedChangesTitle: "已提交的更改",
    discardAllChanges: "丢弃全部更改", stageAllChanges: "暂存全部更改", stageAllShort: "暂存全部", moreCommitActions: "更多提交和远程操作",
    filterFiles: "筛选文件…", filterBranches: "筛选分支…", forcePush: "强制推送", commitAndPush: "提交并推送", fastForward: "快速前进", pull: "拉取", sync: "同步", rebaseMain: "变基到 origin/main", fetch: "获取",
    confirmForcePush: (branch: string) => `确定要强制推送分支「${branch}」吗？这可能覆盖远程提交。`, confirmRebaseMain: "确定要将当前分支变基到 origin/main 吗？发生冲突时需要手动处理。",
    copyCommitHash: "复制提交哈希", copyCommitMessage: "复制提交信息", copyCommitInfo: "复制完整提交信息", unstageAll: "取消暂存全部", discardChanges: "丢弃更改", stageChanges: "暂存更改", unstage: "取消暂存",
    commitPlaceholder: "信息", commitTitle: "提交 (Ctrl+Enter)", committing: "提交中…", commit: "提交", commitHistoryTitle: "提交", loadingCommitFiles: "加载改动文件…", noFileChangesInCommit: "此提交没有文件改动", noCommitsYet: "暂无提交记录", loadingHistory: "加载中…", loadHistoryFailed: "加载提交历史失败", loadStatusFailed: "加载 Git 状态失败",
    confirmDiscard: (what: string) => `确定要丢弃${what}吗？此操作无法撤销。`, changesToPath: (path: string) => `「${path}」的更改`, allUnstagedChanges: "全部未暂存的更改", push: "推送到 origin", pushShort: "推", switchingBranch: "切换中…", noLocalBranches: "没有本地分支", loadBranchesFailed: "加载分支列表失败", checkoutFailed: "切换分支失败",
    confirmPush: (branch: string) => `确定要把分支「${branch}」推送到 origin 吗？`, pushedTo: (branch: string) => `已推送「${branch}」到 origin`, resizeHistoryPanel: "调整提交历史面板高度", staged: "已暂存", unstaged: "未暂存", loadDiffFailed: "加载 diff 失败", loadingDiff: "加载 diff…", noDiffToShow: "没有可显示的改动",
  },
};

const en = {
  common: { refresh: "Refresh", close: "Close", unknownError: "Unknown error" },
  git: {
    notConnected: "Git backend not connected", enterCommitMessage: "Enter a commit message", noStagedChanges: "No staged changes", actionFailed: "Action failed",
    browserPreviewNotice: "Cannot connect to the local Git backend. Currently in browser preview mode — open this app inside the Tauri window to enable real Git operations.",
    noChangesHeading: "No changes on this branch", noChangesSupportingText: (baseRef: string) => `This workspace is clean and this branch has no changes ahead of ${baseRef}`, baseRefFallback: "base",
    stagedChangesTitle: "Staged Changes", changesTitle: "Changes", untrackedFilesTitle: "Untracked Files", committedChangesTitle: "Committed Changes",
    discardAllChanges: "Discard All Changes", stageAllChanges: "Stage All Changes", stageAllShort: "Stage All", moreCommitActions: "More commit and remote actions",
    filterFiles: "Filter files…", filterBranches: "Filter branches…", forcePush: "Force Push", commitAndPush: "Commit & Push", fastForward: "Fast-forward", pull: "Pull", sync: "Sync", rebaseMain: "Rebase from origin/main", fetch: "Fetch",
    confirmForcePush: (branch: string) => `Force push branch "${branch}"? This can overwrite remote commits.`, confirmRebaseMain: "Rebase the current branch onto origin/main? Conflicts may require manual resolution.",
    copyCommitHash: "Copy commit hash", copyCommitMessage: "Copy commit message", copyCommitInfo: "Copy commit details", unstageAll: "Unstage All", discardChanges: "Discard Changes", stageChanges: "Stage Changes", unstage: "Unstage",
    commitPlaceholder: "Message", commitTitle: "Commit (Ctrl+Enter)", committing: "Committing…", commit: "Commit", commitHistoryTitle: "Commits", loadingCommitFiles: "Loading changed files…", noFileChangesInCommit: "No file changes in this commit", noCommitsYet: "No commits yet", loadingHistory: "Loading…", loadHistoryFailed: "Failed to load commit history", loadStatusFailed: "Failed to load Git status",
    confirmDiscard: (what: string) => `Discard ${what}? This cannot be undone.`, changesToPath: (path: string) => `the changes to "${path}"`, allUnstagedChanges: "all unstaged changes", push: "Push to origin", pushShort: "Push", switchingBranch: "Switching…", noLocalBranches: "No local branches", loadBranchesFailed: "Failed to load branches", checkoutFailed: "Failed to switch branch",
    confirmPush: (branch: string) => `Push branch "${branch}" to origin?`, pushedTo: (branch: string) => `Pushed "${branch}" to origin`, resizeHistoryPanel: "Resize commit history panel", staged: "Staged", unstaged: "Unstaged", loadDiffFailed: "Failed to load diff", loadingDiff: "Loading diff…", noDiffToShow: "No changes to display",
  },
};

export const sourceControlTranslations = { zh, en };

export function detectSourceControlLanguage(): SourceControlLanguage {
  const stored = typeof localStorage === "undefined" ? null : localStorage.getItem("language");
  if (stored === "zh" || stored === "en") return stored;
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function useSourceControlI18n() {
  const [language, setLanguage] = useState<SourceControlLanguage>(detectSourceControlLanguage);

  useEffect(() => {
    const refresh = () => setLanguage(detectSourceControlLanguage());
    window.addEventListener("storage", refresh);
    window.addEventListener("app-language-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("app-language-change", refresh);
    };
  }, []);

  return { lang: language, t: sourceControlTranslations[language] };
}
