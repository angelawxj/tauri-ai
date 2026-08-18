import { invoke } from "@tauri-apps/api/core";
import type { BranchInfo, CommitInfo, FileEntry, GitHistoryContext, GitStatus } from "./types";
import { detectSourceControlLanguage, sourceControlTranslations } from "./i18n";

const NOT_TAURI = "NOT_TAURI";

export class SourceControlApiError extends Error {}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new SourceControlApiError(NOT_TAURI);
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    const message =
      typeof err === "string" ? err : err instanceof Error ? err.message : sourceControlTranslations[detectSourceControlLanguage()].common.unknownError;
    throw new SourceControlApiError(message);
  }
}

export function isApiUnavailable(error: unknown): boolean {
  return error instanceof SourceControlApiError && error.message === NOT_TAURI;
}

export const api = {
  status: () => call<GitStatus>("git_status"),
  setCurrentProject: (path: string) => call<GitStatus>("set_current_project", { path }),
  stage: (path: string) => call<void>("git_stage", { path }),
  stageAll: () => call<void>("git_stage_all"),
  unstage: (path: string) => call<void>("git_unstage", { path }),
  unstageAll: () => call<void>("git_unstage_all"),
  discard: (path: string) => call<void>("git_discard", { path }),
  commit: (message: string) => call<string>("git_commit", { message }),
  // A limit of 0 asks the backend for the complete history reachable from HEAD.
  log: (limit = 0) => call<CommitInfo[]>("git_log", { limit }),
  historyContext: () => call<GitHistoryContext>("git_history_context"),
  commitFiles: (hash: string) => call<FileEntry[]>("git_commit_files", { hash }),
  committedFiles: () => call<FileEntry[]>("git_committed_files"),
  diff: (path: string, staged: boolean) => call<string>("git_diff", { path, staged }),
  commitDiff: (hash: string, path: string) => call<string>("git_commit_diff", { hash, path }),
  branches: () => call<BranchInfo[]>("git_branches"),
  checkoutBranch: (name: string) => call<void>("git_checkout_branch", { name }),
  push: (branch: string) => call<string>("git_push", { branch }),
  forcePush: (branch: string) => call<string>("git_force_push", { branch }),
  fetch: () => call<string>("git_fetch"),
  pull: () => call<string>("git_pull"),
  rebaseMain: () => call<string>("git_rebase_main"),
  abortMerge: () => call<string>("git_abort_merge"),
};
