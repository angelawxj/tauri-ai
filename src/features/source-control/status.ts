import type { FileStatus } from "./types";

export const STATUS_LABELS: Record<FileStatus, string> = {
  M: "M",
  A: "A",
  D: "D",
  R: "R",
  U: "U",
  C: "C",
};

/** 复用项目主题里已有的 --color-git-* Tailwind 色令牌，两个 Tab 共用同一套配色 */
export const STATUS_COLOR_CLASS: Record<FileStatus, string> = {
  M: "text-git-modified",
  A: "text-git-added",
  D: "text-git-deleted",
  R: "text-git-renamed",
  U: "text-git-untracked",
  C: "text-git-conflict",
};

export const STATUS_COLOR_VALUE: Record<FileStatus, string> = {
  M: "var(--git-decoration-modified)",
  A: "var(--git-decoration-added)",
  D: "var(--git-decoration-deleted)",
  R: "var(--git-decoration-renamed)",
  U: "var(--git-decoration-untracked)",
  C: "var(--git-decoration-conflict)",
};
