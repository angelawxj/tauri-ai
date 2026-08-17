import { useEffect, useState } from "react";

/** Explorer owns its strings; the host only supplies the active language. */
export type ExplorerLanguage = "zh" | "en";

const zh = {
  common: { refresh: "刷新", close: "关闭", unknownError: "未知错误" },
  explorer: {
    title: "资源管理器",
    notConnected: "无法连接本地文件系统",
    browserPreviewNotice: "无法连接本地文件系统。当前处于浏览器预览模式，请在 Tauri 应用窗口中打开以浏览项目文件。",
    filterFiles: "查找文件",
    names: "名称",
    contents: "内容",
    searchPlaceholder: "搜索",
    matchCase: "区分大小写",
    matchWholeWord: "全字匹配",
    useRegex: "使用正则表达式",
    filesToInclude: "要包含的文件",
    filesToExclude: "要排除的文件",
    includePlaceholder: "要包含的文件（例如 *.ts、src/**）",
    excludePlaceholder: "要排除的文件（例如 *.min.js、dist/**）",
    typeToSearch: "输入要在文件中搜索的内容",
    noSearchResults: "没有找到结果",
    searchFailed: "搜索失败",
    resultSummary: (matches: number, files: number) => `${matches} 结果 在 ${files} 文件`,
    resultsTruncated: "（结果已截断）",
    loadingTree: "加载中…",
    emptyDirectory: "此工作区暂无文件",
    loadDirFailed: "加载目录失败",
    loadingFile: "加载文件…",
    loadFileFailed: "加载文件失败",
    noFileSelected: "没有可显示的文件",
    collapseAll: "全部折叠",
    moreActions: "更多操作",
    undo: "撤销文件操作",
    redo: "重做文件操作",
    showDotfiles: "显示点文件",
    showGitIgnoredFiles: "显示被 Git 忽略的文件",
    newFile: "新建文件",
    newFolder: "新建文件夹",
    viewFile: "查看文件",
    duplicate: "创建副本",
    rename: "重命名",
    delete: "删除",
    copyPath: "复制路径",
    copyAbsolutePath: "复制绝对路径",
    copyRelativePath: "复制相对路径",
    collapseFolder: "折叠文件夹子树",
    revealInFileManager: "在系统文件管理器中显示",
    openInFileManager: "在文件资源管理器中打开",
    openInVsCode: "在 VS Code 中打开",
    actionFailed: "操作失败",
    confirmDeleteOne: (name: string) => `确定要删除「${name}」吗？会移到系统回收站。`,
    confirmDeleteMany: (count: number) => `确定要删除选中的 ${count} 个项目吗？会移到系统回收站。`,
    newFilePlaceholder: "文件名",
    newFolderPlaceholder: "文件夹名称",
  },
};

const en = {
  common: { refresh: "Refresh", close: "Close", unknownError: "Unknown error" },
  explorer: {
    title: "Explorer",
    notConnected: "Cannot connect to the local file system",
    browserPreviewNotice: "Cannot connect to the local file system. Currently in browser preview mode — open this app inside the Tauri window to browse project files.",
    filterFiles: "Find files",
    names: "Names",
    contents: "Contents",
    searchPlaceholder: "Search",
    matchCase: "Match Case",
    matchWholeWord: "Match Whole Word",
    useRegex: "Use Regular Expression",
    filesToInclude: "Files To Include",
    filesToExclude: "Files To Exclude",
    includePlaceholder: "files to include (e.g. *.ts, src/**)",
    excludePlaceholder: "files to exclude (e.g. *.min.js, dist/**)",
    typeToSearch: "Type to search in files",
    noSearchResults: "No results found",
    searchFailed: "Search failed",
    resultSummary: (matches: number, files: number) => `${matches} results in ${files} files`,
    resultsTruncated: "(results truncated)",
    loadingTree: "Loading…",
    emptyDirectory: "No files in this workspace",
    loadDirFailed: "Failed to load directory",
    loadingFile: "Loading file…",
    loadFileFailed: "Failed to load file",
    noFileSelected: "No file to display",
    collapseAll: "Collapse All",
    moreActions: "More Explorer Actions",
    undo: "Undo File Operation",
    redo: "Redo File Operation",
    showDotfiles: "Show Dotfiles",
    showGitIgnoredFiles: "Show Git Ignored Files",
    newFile: "New File",
    newFolder: "New Folder",
    viewFile: "View File",
    duplicate: "Duplicate",
    rename: "Rename",
    delete: "Delete",
    copyPath: "Copy Path",
    copyAbsolutePath: "Copy Absolute Path",
    copyRelativePath: "Copy Relative Path",
    collapseFolder: "Collapse Folder Subtree",
    revealInFileManager: "Reveal in File Manager",
    openInFileManager: "Open in File Explorer",
    openInVsCode: "Open in VS Code",
    actionFailed: "Action failed",
    confirmDeleteOne: (name: string) => `Delete "${name}"? It will be moved to the system trash.`,
    confirmDeleteMany: (count: number) => `Delete the ${count} selected items? They will be moved to the system trash.`,
    newFilePlaceholder: "File name",
    newFolderPlaceholder: "Folder name",
  },
};

export const explorerTranslations = { zh, en };

export function detectExplorerLanguage(): ExplorerLanguage {
  const stored = typeof localStorage === "undefined" ? null : localStorage.getItem("language");
  if (stored === "zh" || stored === "en") return stored;
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function useExplorerI18n() {
  const [language, setLanguage] = useState<ExplorerLanguage>(detectExplorerLanguage);

  useEffect(() => {
    const refresh = () => setLanguage(detectExplorerLanguage());
    window.addEventListener("storage", refresh);
    window.addEventListener("app-language-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("app-language-change", refresh);
    };
  }, []);

  return { lang: language, t: explorerTranslations[language] };
}
