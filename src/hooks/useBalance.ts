"use client";

import { useCallback, useEffect } from "react";
import { useWalletStore } from "@/stores/wallet";

/**
 * Truth-first balance hook.
 * It does not invent balances or mutate them with demo randomness.
 * Until live wallet reads are wired in, the store stays empty and the UI can
 * render honest zero/empty states.
 */
export function useBalance() {
  const { balances, loading, error } = useWalletStore();
  const setLoading = useWalletStore((s) => s.setLoading);
  const setError = useWalletStore((s) => s.setError);
  const markUpdated = useWalletStore((s) => s.markUpdated);

  useEffect(() => {
    setLoading(false);
    setError(null);
    markUpdated();
  }, [markUpdated, setError, setLoading]);

  const refresh = useCallback(() => {
    setLoading(false);
    setError(null);
    markUpdated();
  }, [markUpdated, setError, setLoading]);

  return { balances, loading, error, refresh };
}
