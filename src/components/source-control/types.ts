export type FileStatus = "M" | "A" | "D" | "R" | "U";

export interface FileEntry {
  path: string;
  status: FileStatus;
}

export interface GitStatus {
  branch: string;
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

export interface BranchInfo {
  name: string;
  isHead: boolean;
}

/** 一次"打开某个文件 diff"的请求，从 Source Control 面板传给中间区域的 MainArea */
export interface OpenDiffRequest {
  path: string;
  staged: boolean;
}
