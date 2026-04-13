"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEarnStore } from "@/stores/earn";
import {
  getValidatorPools,
  getStakedPositions,
} from "@/lib/staking";

/**
 * Staking data hook
 * Polls mock staking pools and user positions
 */
export function useStaking() {
  const pools = useEarnStore((s) => s.staking.pools);
  const positions = useEarnStore((s) => s.staking.positions);
  const loading = useEarnStore((s) => s.staking.loading);
  const error = useEarnStore((s) => s.staking.error);

  const setPools = useEarnStore((s) => s.setStakingPools);
  const setPositions = useEarnStore((s) => s.setStakedPositions);
  const setLoading = useEarnStore((s) => s.setStakingLoading);
  const setError = useEarnStore((s) => s.setStakingError);

  const initialized = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [poolData, posData] = await Promise.all([
        getValidatorPools(),
        getStakedPositions(),
      ]);
      setPools(poolData);
      setPositions(posData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staking data");
    } finally {
      setLoading(false);
    }
  }, [setPools, setPositions, setLoading, setError]);

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

  return { pools, positions, loading, error, refresh };
}
