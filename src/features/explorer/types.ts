export interface ExplorerEntry {
  name: string;
  path: string;
  isDir: boolean;
}

/** Emitted by a file row click; the host decides how/where to preview it. */
export interface OpenFileRequest {
  path: string;
}
