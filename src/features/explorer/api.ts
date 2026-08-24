import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ExplorerEntry, ExplorerSearchResult } from "./types";
import { explorerTranslations, detectExplorerLanguage } from "./i18n";

const NOT_TAURI = "NOT_TAURI";
const WATCH_EVENT = "explorer://changed";

export class ExplorerApiError extends Error {}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new ExplorerApiError(NOT_TAURI);
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    const message =
      typeof err === "string" ? err : err instanceof Error ? err.message : explorerTranslations[detectExplorerLanguage()].common.unknownError;
    throw new ExplorerApiError(message);
  }
}

export function isApiUnavailable(error: unknown): boolean {
  return error instanceof ExplorerApiError && error.message === NOT_TAURI;
}

export const api = {
  setCurrentProject: (path: string) => call<ExplorerEntry[]>("explorer_set_current_project", { path }),
  listDir: (path?: string, showGitIgnored?: boolean) => call<ExplorerEntry[]>("explorer_list_dir", { path, showGitIgnored }),
  readFile: (path: string) => call<string>("explorer_read_file", { path }),
  resolveLocalHtmlUrl: (path: string) => call<string>("explorer_resolve_local_html_url", { path }),
  createFile: (parentPath: string, name: string) => call<void>("explorer_create_file", { parentPath, name }),
  createDir: (parentPath: string, name: string) => call<void>("explorer_create_dir", { parentPath, name }),
  rename: (path: string, newName: string) => call<string>("explorer_rename", { path, newName }),
  move: (sourcePath: string, destDir: string) => call<string>("explorer_move", { sourcePath, destDir }),
  delete: (paths: string[]) => call<void>("explorer_delete", { paths }),
  duplicate: (path: string) => call<string>("explorer_duplicate", { path }),
  reveal: (path: string) => call<void>("explorer_reveal", { path }),
  openCurrentProject: () => call<void>("explorer_open_current_project"),
  openCurrentProjectInVsCode: () => call<void>("explorer_open_current_project_in_vscode"),
  search: (query: string, caseSensitive: boolean, wholeWord: boolean, useRegex: boolean, includePattern: string, excludePattern: string) =>
    call<ExplorerSearchResult>("explorer_search", { query, caseSensitive, wholeWord, useRegex, includePattern, excludePattern }),
  findFiles: (query: string, showGitIgnored: boolean) => call<string[]>("explorer_find_files", { query, showGitIgnored }),
};

/** Fires whenever anything changes under the watched project root (no payload — just "re-check"). */
export function onExplorerChanged(handler: () => void): () => void {
  if (!isTauriRuntime()) return () => {};
  const unlisten = listen(WATCH_EVENT, handler);
  return () => {
    void unlisten.then((fn) => fn());
  };
}
