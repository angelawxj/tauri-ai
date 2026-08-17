export interface ExplorerEntry {
  name: string;
  path: string;
  isDir: boolean;
  ignored: boolean;
}

/** Emitted by a file row click; the host decides how/where to preview it. */
export interface OpenFileRequest {
  path: string;
}

export interface ExplorerSearchMatch {
  line: number;
  column: number;
  preview: string;
  beforeText: string;
  matchedText: string;
  afterText: string;
}

export interface ExplorerSearchFile {
  path: string;
  matches: ExplorerSearchMatch[];
}

export interface ExplorerSearchResult {
  files: ExplorerSearchFile[];
  totalMatches: number;
  truncated: boolean;
}
