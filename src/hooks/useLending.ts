"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEarnStore } from "@/stores/earn";
import {
  getLendingMarkets,
  getLendingPositions,
} from "@/lib/lending";

/**
 * Lending data hook
 * Polls mock lending markets and user positions
 */
export function useLending() {
  const markets = useEarnStore((s) => s.lending.markets);
  const positions = useEarnStore((s) => s.lending.positions);
  const loading = useEarnStore((s) => s.lending.loading);
  const error = useEarnStore((s) => s.lending.error);

  const setMarkets = useEarnStore((s) => s.setLendingMarkets);
  const setPositions = useEarnStore((s) => s.setLendingPositions);
  const setLoading = useEarnStore((s) => s.setLendingLoading);
  const setError = useEarnStore((s) => s.setLendingError);

  const initialized = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [marketData, posData] = await Promise.all([
        getLendingMarkets(),
        getLendingPositions(),
      ]);
      setMarkets(marketData);
      setPositions(posData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lending data");
    } finally {
      setLoading(false);
    }
  }, [setMarkets, setPositions, setLoading, setError]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      load();
    }

    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => {
    initialized.current = false;
    load();
  }, [load]);

  return { markets, positions, loading, error, refresh };
}
