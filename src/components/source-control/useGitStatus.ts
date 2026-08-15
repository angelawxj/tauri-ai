import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.status();
      setStatus(next);
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
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, unavailable, refresh };
}
