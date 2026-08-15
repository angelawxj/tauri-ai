import { useCallback, useEffect, useState } from "react";
import { api, isApiUnavailable } from "./api";
import type { CommitInfo, FileEntry } from "./types";

interface UseGitHistoryResult {
  commits: CommitInfo[];
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  refresh: () => Promise<void>;
  expanded: Set<string>;
  toggleExpanded: (hash: string) => void;
  filesFor: (hash: string) => FileEntry[] | undefined;
  isFilesLoading: (hash: string) => boolean;
}

/** bump `refreshSignal` (e.g. right after a commit) to force a re-fetch */
export function useGitHistory(refreshSignal: number): UseGitHistoryResult {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fileCache, setFileCache] = useState<Record<string, FileEntry[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const log = await api.log(50);
      setCommits(log);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      if (isApiUnavailable(err)) {
        setUnavailable(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "加载提交历史失败");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshSignal]);

  const toggleExpanded = useCallback(
    (hash: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(hash)) {
          next.delete(hash);
        } else {
          next.add(hash);
        }
        return next;
      });

      if (!fileCache[hash] && !loadingFiles.has(hash)) {
        setLoadingFiles((prev) => new Set(prev).add(hash));
        api
          .commitFiles(hash)
          .then((files) => setFileCache((prev) => ({ ...prev, [hash]: files })))
          .catch(() => setFileCache((prev) => ({ ...prev, [hash]: [] })))
          .finally(() => {
            setLoadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(hash);
              return next;
            });
          });
      }
    },
    [fileCache, loadingFiles],
  );

  return {
    commits,
    loading,
    error,
    unavailable,
    refresh,
    expanded,
    toggleExpanded,
    filesFor: (hash) => fileCache[hash],
    isFilesLoading: (hash) => loadingFiles.has(hash),
  };
}
