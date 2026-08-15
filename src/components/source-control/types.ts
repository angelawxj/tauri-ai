export type FileStatus = "M" | "A" | "D" | "R" | "U" | "C";

export interface FileEntry {
  path: string;
  status: FileStatus;
  additions: number;
  deletions: number;
}

export interface GitStatus {
  branch: string;
  repoName: string;
  repoPath: string;
  staged: FileEntry[];
  unstaged: FileEntry[];
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: number;
  /** full parent commit hashes, in parent order (first parent first) */
  parents: string[];
  /** local branch / tag names pointing at this commit */
  refs: string[];
}

/** Context needed to assign graph lanes in the same way as Orca. */
export interface HistoryRef {
  id: string;
  name: string;
  revision?: string;
}

export interface GitHistoryContext {
  currentRef?: HistoryRef;
  remoteRef?: HistoryRef;
  baseRef?: HistoryRef;
  mergeBase?: string;
  hasIncomingChanges: boolean;
  hasOutgoingChanges: boolean;
}

export interface BranchInfo {
  name: string;
  isHead: boolean;
}

/** 一次"打开某个文件 diff"的请求，从 Source Control 面板传给中间区域的 MainArea */
export interface OpenDiffRequest {
  path: string;
  staged: boolean;
  /** When present, show this file's patch from a committed revision. */
  commitHash?: string;
}
