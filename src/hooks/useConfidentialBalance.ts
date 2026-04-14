"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/stores/wallet";

/**
 * Truth-first confidential balance hook.
 * Until real Tongo reads are connected, we mark the feature unavailable rather
 * than inventing a private balance.
 */
export function useConfidentialBalance() {
  const { confidential, confidentialAvailable, loading, error } =
    useWalletStore();
  const setConfidentialUnavailable = useWalletStore(
    (s) => s.setConfidentialUnavailable
  );
  const setError = useWalletStore((s) => s.setError);
  const setLoading = useWalletStore((s) => s.setLoading);

  useEffect(() => {
    setConfidentialUnavailable();
    setError(null);
    setLoading(false);
  }, [setConfidentialUnavailable, setError, setLoading]);

  return {
    confidential,
    confidentialAvailable,
    loading,
    error,
  };
}
