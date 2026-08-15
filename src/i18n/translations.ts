import type { Language } from "./language";

interface MockSession {
  id: string;
  title: string;
  time: string;
}

interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface TranslationDict {
  common: {
    refresh: string;
    close: string;
    unknownError: string;
  };
  sidebar: {
    searchSessions: string;
    newChat: string;
    switchToLightTheme: string;
    switchToDarkTheme: string;
    settings: string;
    mockSessions: MockSession[];
    projects: string;
    addProject: string;
    noProjects: string;
    removeProject: string;
    confirmRemoveProject: (name: string) => string;
  };
  chat: {
    modelPreviewNote: string;
    typing: string;
    placeholder: string;
    send: string;
    you: string;
    initialMessages: DemoMessage[];
    demoReply: string;
  };
  tabs: {
    chat: string;
    git: string;
    sourceControl: string;
    files: string;
    terminal: string;
    comingSoon: string;
  };
  detailPanel: {
    resizePanel: string;
  };
  git: {
    notConnected: string;
    enterCommitMessage: string;
    noStagedChanges: string;
    actionFailed: string;
    browserPreviewNotice: string;
    noChangesDetected: string;
    stagedChangesTitle: string;
    changesTitle: string;
    untrackedFilesTitle: string;
    committedChangesTitle: string;
    discardAllChanges: string;
    stageAllChanges: string;
    publishBranch: string;
    moreCommitActions: string;
    filterFiles: string;
    filterBranches: string;
    forcePush: string;
    commitAndPush: string;
    fastForward: string;
    pull: string;
    sync: string;
    rebaseMain: string;
    fetch: string;
    confirmForcePush: (branch: string) => string;
    confirmRebaseMain: string;
    showCommitChanges: string;
    hideCommitChanges: string;
    copyCommitHash: string;
    copyCommitMessage: string;
    copyCommitInfo: string;
    unstageAll: string;
    discardChanges: string;
    stageChanges: string;
    unstage: string;
    commitPlaceholder: string;
    commitTitle: string;
    committing: string;
    commit: string;
    commitHistoryTitle: string;
    loadingCommitFiles: string;
    noFileChangesInCommit: string;
    noCommitsYet: string;
    loadingHistory: string;
    loadHistoryFailed: string;
    loadStatusFailed: string;
    justNow: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
    daysAgo: (n: number) => string;
    confirmDiscard: (what: string) => string;
    changesToPath: (path: string) => string;
    allUnstagedChanges: string;
    push: string;
    pushShort: string;
    switchingBranch: string;
    noLocalBranches: string;
    loadBranchesFailed: string;
    checkoutFailed: string;
    confirmPush: (branch: string) => string;
    pushedTo: (branch: string) => string;
    resizeHistoryPanel: string;
    staged: string;
    unstaged: string;
    loadDiffFailed: string;
    loadingDiff: string;
    noDiffToShow: string;
  };
}

const zh: TranslationDict = {
  common: {
    refresh: "刷新",
    close: "关闭",
    unknownError: "未知错误",
  },
  sidebar: {
    searchSessions: "搜索会话",
    newChat: "新建对话",
    switchToLightTheme: "切换到亮色主题",
    switchToDarkTheme: "切换到暗色主题",
    settings: "设置",
    mockSessions: [
      { id: "1", title: "重构 Git 状态解析逻辑", time: "10:24" },
      { id: "2", title: "为什么 useEffect 触发了两次", time: "昨天" },
      { id: "3", title: "解释 git2 的 revwalk 排序", time: "昨天" },
      { id: "4", title: "生成提交信息文案", time: "周二" },
      { id: "5", title: "Tailwind v4 主题变量迁移", time: "上周" },
    ],
    projects: "项目",
    addProject: "添加项目",
    noProjects: "还没有项目，点击上方 + 添加本地 Git 仓库",
    removeProject: "移除项目",
    confirmRemoveProject: (name) => `确定要移除项目「${name}」吗？（不会删除本地文件）`,
  },
  chat: {
    modelPreviewNote: "UI 预览 · 未接入真实模型",
    typing: "正在输入…",
    placeholder: "发消息给 AI…（Enter 发送，Shift+Enter 换行）",
    send: "发送",
    you: "我",
    initialMessages: [
      { id: "m1", role: "user", content: "右侧的 Git 管理面板现在能看到暂存区和提交历史了吗？" },
      {
        id: "m2",
        role: "assistant",
        content:
          "可以，右侧「Git 管理」Tab 已经还原了 VSCode 源代码管理面板的核心交互：暂存/取消暂存、提交输入框、以及带分支图的提交历史，点击某条提交还能展开看它改了哪些文件。",
      },
    ],
    demoReply: "（示例回复，尚未接入真实模型 —— 当前只搭建了问答区的界面壳子）",
  },
  tabs: {
    chat: "对话",
    git: "Git 管理",
    sourceControl: "源代码管理",
    files: "文件",
    terminal: "终端",
    comingSoon: "即将支持",
  },
  detailPanel: {
    resizePanel: "调整右侧面板宽度",
  },
  git: {
    notConnected: "未连接 Git 后端",
    enterCommitMessage: "请输入提交信息",
    noStagedChanges: "没有已暂存的更改",
    actionFailed: "操作失败",
    browserPreviewNotice:
      "无法连接本地 Git 后端。当前处于浏览器预览模式，请在 Tauri 应用窗口中打开以启用真实的 Git 操作。",
    noChangesDetected: "没有检测到更改",
    stagedChangesTitle: "暂存的更改",
    changesTitle: "更改",
    untrackedFilesTitle: "未跟踪文件",
    committedChangesTitle: "已提交的更改",
    discardAllChanges: "丢弃全部更改",
    stageAllChanges: "暂存全部更改",
    publishBranch: "发布分支",
    moreCommitActions: "更多提交和远程操作",
    filterFiles: "筛选文件…",
    filterBranches: "筛选分支…",
    forcePush: "强制推送",
    commitAndPush: "提交并推送",
    fastForward: "快速前进",
    pull: "拉取",
    sync: "同步",
    rebaseMain: "变基到 origin/main",
    fetch: "获取",
    confirmForcePush: (branch) => `确定要强制推送分支「${branch}」吗？这可能覆盖远程提交。`,
    confirmRebaseMain: "确定要将当前分支变基到 origin/main 吗？发生冲突时需要手动处理。",
    showCommitChanges: "展开改动",
    hideCommitChanges: "收起改动",
    copyCommitHash: "复制提交哈希",
    copyCommitMessage: "复制提交信息",
    copyCommitInfo: "复制完整提交信息",
    unstageAll: "取消暂存全部",
    discardChanges: "丢弃更改",
    stageChanges: "暂存更改",
    unstage: "取消暂存",
    commitPlaceholder: "提交消息 (Ctrl+Enter 提交)",
    commitTitle: "提交 (Ctrl+Enter)",
    committing: "提交中…",
    commit: "提交",
    commitHistoryTitle: "提交",
    loadingCommitFiles: "加载改动文件…",
    noFileChangesInCommit: "此提交没有文件改动",
    noCommitsYet: "暂无提交记录",
    loadingHistory: "加载中…",
    loadHistoryFailed: "加载提交历史失败",
    loadStatusFailed: "加载 Git 状态失败",
    justNow: "刚刚",
    minutesAgo: (n) => `${n} 分钟前`,
    hoursAgo: (n) => `${n} 小时前`,
    daysAgo: (n) => `${n} 天前`,
    confirmDiscard: (what) => `确定要丢弃${what}吗？此操作无法撤销。`,
    changesToPath: (path) => `「${path}」的更改`,
    allUnstagedChanges: "全部未暂存的更改",
    push: "推送到 origin",
    pushShort: "推",
    switchingBranch: "切换中…",
    noLocalBranches: "没有本地分支",
    loadBranchesFailed: "加载分支列表失败",
    checkoutFailed: "切换分支失败",
    confirmPush: (branch) => `确定要把分支「${branch}」推送到 origin 吗？`,
    pushedTo: (branch) => `已推送「${branch}」到 origin`,
    resizeHistoryPanel: "调整提交历史面板高度",
    staged: "已暂存",
    unstaged: "未暂存",
    loadDiffFailed: "加载 diff 失败",
    loadingDiff: "加载 diff…",
    noDiffToShow: "没有可显示的改动",
  },
};

const en: TranslationDict = {
  common: {
    refresh: "Refresh",
    close: "Close",
    unknownError: "Unknown error",
  },
  sidebar: {
    searchSessions: "Search sessions",
    newChat: "New Chat",
    switchToLightTheme: "Switch to light theme",
    switchToDarkTheme: "Switch to dark theme",
    settings: "Settings",
    mockSessions: [
      { id: "1", title: "Refactor Git status parsing logic", time: "10:24" },
      { id: "2", title: "Why does useEffect fire twice", time: "Yesterday" },
      { id: "3", title: "Explain git2's revwalk ordering", time: "Yesterday" },
      { id: "4", title: "Generate commit message copy", time: "Tue" },
      { id: "5", title: "Tailwind v4 theme variable migration", time: "Last week" },
    ],
    projects: "Projects",
    addProject: "Add Project",
    noProjects: "No projects yet — click + above to add a local Git repository",
    removeProject: "Remove project",
    confirmRemoveProject: (name) => `Remove project "${name}"? (local files are untouched)`,
  },
  chat: {
    modelPreviewNote: "UI preview · not connected to a real model",
    typing: "Typing…",
    placeholder: "Message AI… (Enter to send, Shift+Enter for newline)",
    send: "Send",
    you: "Me",
    initialMessages: [
      { id: "m1", role: "user", content: "Can the Git panel on the right show the staged area and commit history now?" },
      {
        id: "m2",
        role: "assistant",
        content:
          "Yes, the \"Git\" tab on the right now mirrors the core interactions of VSCode's Source Control panel: stage/unstage, a commit message box, and commit history with a branch graph — click a commit to expand and see which files it changed.",
      },
    ],
    demoReply: "(Sample reply — no real model is connected yet, this is just the UI shell for the chat area)",
  },
  tabs: {
    chat: "Chat",
    git: "Git",
    sourceControl: "Source Control",
    files: "Files",
    terminal: "Terminal",
    comingSoon: "Coming soon",
  },
  detailPanel: {
    resizePanel: "Resize right panel",
  },
  git: {
    notConnected: "Git backend not connected",
    enterCommitMessage: "Enter a commit message",
    noStagedChanges: "No staged changes",
    actionFailed: "Action failed",
    browserPreviewNotice:
      "Cannot connect to the local Git backend. Currently in browser preview mode — open this app inside the Tauri window to enable real Git operations.",
    noChangesDetected: "No changes detected",
    stagedChangesTitle: "Staged Changes",
    changesTitle: "Changes",
    untrackedFilesTitle: "Untracked Files",
    committedChangesTitle: "Committed Changes",
    discardAllChanges: "Discard All Changes",
    stageAllChanges: "Stage All Changes",
    publishBranch: "Publish Branch",
    moreCommitActions: "More commit and remote actions",
    filterFiles: "Filter files…",
    filterBranches: "Filter branches…",
    forcePush: "Force Push",
    commitAndPush: "Commit & Push",
    fastForward: "Fast-forward",
    pull: "Pull",
    sync: "Sync",
    rebaseMain: "Rebase from origin/main",
    fetch: "Fetch",
    confirmForcePush: (branch) => `Force push branch "${branch}"? This can overwrite remote commits.`,
    confirmRebaseMain: "Rebase the current branch onto origin/main? Conflicts may require manual resolution.",
    showCommitChanges: "Show changes",
    hideCommitChanges: "Hide changes",
    copyCommitHash: "Copy commit hash",
    copyCommitMessage: "Copy commit message",
    copyCommitInfo: "Copy commit details",
    unstageAll: "Unstage All",
    discardChanges: "Discard Changes",
    stageChanges: "Stage Changes",
    unstage: "Unstage",
    commitPlaceholder: "Commit message (Ctrl+Enter to commit)",
    commitTitle: "Commit (Ctrl+Enter)",
    committing: "Committing…",
    commit: "Commit",
    commitHistoryTitle: "Commits",
    loadingCommitFiles: "Loading changed files…",
    noFileChangesInCommit: "No file changes in this commit",
    noCommitsYet: "No commits yet",
    loadingHistory: "Loading…",
    loadHistoryFailed: "Failed to load commit history",
    loadStatusFailed: "Failed to load Git status",
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    confirmDiscard: (what) => `Discard ${what}? This cannot be undone.`,
    changesToPath: (path) => `the changes to "${path}"`,
    allUnstagedChanges: "all unstaged changes",
    push: "Push to origin",
    pushShort: "Push",
    switchingBranch: "Switching…",
    noLocalBranches: "No local branches",
    loadBranchesFailed: "Failed to load branches",
    checkoutFailed: "Failed to switch branch",
    confirmPush: (branch) => `Push branch "${branch}" to origin?`,
    pushedTo: (branch) => `Pushed "${branch}" to origin`,
    resizeHistoryPanel: "Resize commit history panel",
    staged: "Staged",
    unstaged: "Unstaged",
    loadDiffFailed: "Failed to load diff",
    loadingDiff: "Loading diff…",
    noDiffToShow: "No changes to display",
  },
};

export const translations: Record<Language, TranslationDict> = { zh, en };
