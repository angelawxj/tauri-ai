import { invoke } from "@tauri-apps/api/core";
import type { CommitInfo, FileEntry, GitStatus } from "./types";
import { detectLanguage, translations } from "../../i18n";

const NOT_TAURI = "NOT_TAURI";

export class GitApiError extends Error {}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new GitApiError(NOT_TAURI);
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    const message =
      typeof err === "string" ? err : err instanceof Error ? err.message : translations[detectLanguage()].common.unknownError;
    throw new GitApiError(message);
  }
}

export function isGitApiUnavailable(error: unknown): boolean {
  return error instanceof GitApiError && error.message === NOT_TAURI;
}

export const gitApi = {
  status: () => call<GitStatus>("git_status"),
  stage: (path: string) => call<void>("git_stage", { path }),
  stageAll: () => call<void>("git_stage_all"),
  unstage: (path: string) => call<void>("git_unstage", { path }),
  unstageAll: () => call<void>("git_unstage_all"),
  discard: (path: string) => call<void>("git_discard", { path }),
  commit: (message: string) => call<string>("git_commit", { message }),
  log: (limit = 50) => call<CommitInfo[]>("git_log", { limit }),
  commitFiles: (hash: string) => call<FileEntry[]>("git_commit_files", { hash }),
};
