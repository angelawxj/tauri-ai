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
    loadingTree: "加载中…",
    emptyDirectory: "此工作区暂无文件",
    loadDirFailed: "加载目录失败",
    loadingFile: "加载文件…",
    loadFileFailed: "加载文件失败",
    noFileSelected: "没有可显示的文件",
  },
};

const en = {
  common: { refresh: "Refresh", close: "Close", unknownError: "Unknown error" },
  explorer: {
    title: "Explorer",
    notConnected: "Cannot connect to the local file system",
    browserPreviewNotice: "Cannot connect to the local file system. Currently in browser preview mode — open this app inside the Tauri window to browse project files.",
    filterFiles: "Find files",
    loadingTree: "Loading…",
    emptyDirectory: "No files in this workspace",
    loadDirFailed: "Failed to load directory",
    loadingFile: "Loading file…",
    loadFileFailed: "Failed to load file",
    noFileSelected: "No file to display",
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
