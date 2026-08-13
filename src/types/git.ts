export type FileStatus = "M" | "A" | "D" | "R" | "U" | "?";

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
}
