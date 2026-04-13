"use client";

import { useEffect, useRef } from "react";
import { useWalletStore, type TokenBalance } from "@/stores/wallet";
import { formatBalance } from "@/lib/format";

/**
 * Mock balance hook.
 * Returns mock balances for ETH (0.5), STRK (100), USDC (50).
 * Simulates 15-second polling with setInterval.
 * Stores results in wallet store.
 */
export function useBalance() {
  const { balances, loading, error } = useWalletStore();
  const setBalance = useWalletStore((s) => s.setBalance);
  const setLoading = useWalletStore((s) => s.setLoading);
  const setError = useWalletStore((s) => s.setError);
  const markUpdated = useWalletStore((s) => s.markUpdated);
  const initialized = useRef(false);

  useEffect(() => {
    // Load mock balances
    const loadMockBalances = () => {
      setLoading(true);
      try {
        const mockData: { symbol: string; decimals: number; amount: string }[] = [
          { symbol: "ETH", decimals: 18, amount: "0.5" },
          { symbol: "STRK", decimals: 18, amount: "100" },
          { symbol: "USDC", decimals: 6, amount: "50" },
        ];

        // Add slight randomness to simulate real data changes
        for (const token of mockData) {
          const baseAmount = parseFloat(token.amount);
          const variation = baseAmount * (Math.random() * 0.02 - 0.01); // ±1%
          const adjusted = Math.max(0, baseAmount + variation).toString();
          const balance: TokenBalance = {
            symbol: token.symbol,
            amount: adjusted,
            decimals: token.decimals,
            formatted: formatBalance(adjusted),
          };
          setBalance(token.symbol, balance);
        }

        setError(null);
        markUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load balances");
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    if (!initialized.current) {
      initialized.current = true;
      loadMockBalances();
    }

    // Poll every 15 seconds
    const interval = setInterval(loadMockBalances, 15000);
    return () => clearInterval(interval);
  }, [setBalance, setLoading, setError, markUpdated]);

  const refresh = () => {
    initialized.current = false;
    // Trigger re-run by forcing the effect to re-execute
    useWalletStore.getState().setLoading(true);
    setTimeout(() => {
      initialized.current = false;
      // Force update by toggling loading
      useWalletStore.getState().setLoading(false);
      // The next interval tick will handle the actual refresh
    }, 100);
  };

  return { balances, loading, error, refresh };
}
