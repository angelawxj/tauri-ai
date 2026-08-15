import { useCallback, useEffect, useState } from "react";
import { api, isApiUnavailable } from "./api";
import type { CommitInfo, FileEntry, GitHistoryContext } from "./types";
import { useI18n } from "../../i18n";

interface UseGitHistoryResult {
  commits: CommitInfo[];
  context: GitHistoryContext | undefined;
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
  const { t } = useI18n();
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [context, setContext] = useState<GitHistoryContext>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fileCache, setFileCache] = useState<Record<string, FileEntry[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [log, historyContext] = await Promise.all([api.log(50), api.historyContext()]);
      setCommits(log);
      setContext(historyContext);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      if (isApiUnavailable(err)) {
        setUnavailable(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : t.git.loadHistoryFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshSignal]);

  const toggleExpanded = useCallback(
    (hash: string) => {
      const opening = !expanded.has(hash);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(hash)) {
          next.delete(hash);
        } else {
          next.add(hash);
        }
        return next;
      });

      // Orca requests a commit's files only on its first expansion. Collapsing a
      // row must remain a pure UI operation and cached results are reused.
      if (opening && !fileCache[hash] && !loadingFiles.has(hash)) {
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
    [expanded, fileCache, loadingFiles],
  );

  return {
    commits,
    context,
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
