import { invoke } from "@tauri-apps/api/core";
import type { ExplorerEntry } from "./types";
import { explorerTranslations, detectExplorerLanguage } from "./i18n";

const NOT_TAURI = "NOT_TAURI";

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
  listDir: (path?: string) => call<ExplorerEntry[]>("explorer_list_dir", { path }),
  readFile: (path: string) => call<string>("explorer_read_file", { path }),
};
