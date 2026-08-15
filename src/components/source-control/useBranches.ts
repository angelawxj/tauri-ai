import { useCallback, useEffect, useState } from "react";
import { api, isApiUnavailable } from "./api";
import type { BranchInfo } from "./types";
import { useI18n } from "../../i18n";

interface UseBranchesResult {
  branches: BranchInfo[];
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  refresh: () => Promise<void>;
  checkout: (name: string) => Promise<void>;
  checkingOut: boolean;
}

export function useBranches(): UseBranchesResult {
  const { t } = useI18n();
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.branches();
      setBranches(list);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      if (isApiUnavailable(err)) {
        setUnavailable(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : t.git.loadBranchesFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkout = useCallback(
    async (name: string) => {
      setCheckingOut(true);
      try {
        await api.checkoutBranch(name);
        setError(null);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t.git.checkoutFailed);
        throw err;
      } finally {
        setCheckingOut(false);
      }
    },
    [refresh, t],
  );

  return { branches, loading, error, unavailable, refresh, checkout, checkingOut };
}
