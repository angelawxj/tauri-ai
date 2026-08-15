import { useCallback, useEffect, useRef, useState } from "react";
import { api, isApiUnavailable } from "./api";
import type { GitStatus } from "./types";
import { useI18n } from "../../i18n";

interface UseGitStatusResult {
  status: GitStatus | null;
  loading: boolean;
  error: string | null;
  /** true when not running inside the Tauri shell (e.g. plain browser preview) */
  unavailable: boolean;
  refresh: () => Promise<void>;
}

export function useGitStatus(): UseGitStatusResult {
  const { t } = useI18n();
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const inFlightRef = useRef(false);

  const sameStatus = (left: GitStatus | null, right: GitStatus): boolean =>
    left?.branch === right.branch &&
    left.head === right.head &&
    left.upstreamHead === right.upstreamHead &&
    left.repoName === right.repoName &&
    left.repoPath === right.repoPath &&
    JSON.stringify(left.staged) === JSON.stringify(right.staged) &&
    JSON.stringify(left.unstaged) === JSON.stringify(right.unstaged);

  const refresh = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    try {
      const next = await api.status();
      setStatus((current) => sameStatus(current, next) ? current : next);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      if (isApiUnavailable(err)) {
        setUnavailable(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : t.git.loadStatusFailed);
      }
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const refreshSilently = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const timer = window.setInterval(refreshSilently, 5000);
    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [refresh]);

  return { status, loading, error, unavailable, refresh };
}
