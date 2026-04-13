"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/stores/wallet";

/**
 * Mock confidential balance hook.
 * Returns mock state: balance (2.5 STRK), pending (0.3 STRK), nonce (4).
 * Simulates Tongo contract interaction without a real connection.
 */
export function useConfidentialBalance() {
  const { confidential, confidentialAvailable, loading, error } =
    useWalletStore();
  const setConfidential = useWalletStore((s) => s.setConfidential);
  const setConfidentialUnavailable = useWalletStore(
    (s) => s.setConfidentialUnavailable
  );
  const setError = useWalletStore((s) => s.setError);
  const initialized = useRef(false);

  useEffect(() => {
    const loadMockConfidential = () => {
      try {
        // Mock confidential state
        setConfidential({
          balance: "2.5000",
          pending: "0.3000",
          nonce: 4,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load confidential state"
        );
        setConfidentialUnavailable();
      }
    };

    if (!initialized.current) {
      initialized.current = true;
      loadMockConfidential();
    }

    // Poll every 15 seconds alongside public balances
    const interval = setInterval(loadMockConfidential, 15000);
    return () => clearInterval(interval);
  }, [setConfidential, setConfidentialUnavailable, setError]);

  return {
    confidential,
    confidentialAvailable,
    loading,
    error,
  };
}
