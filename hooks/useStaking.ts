import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { getValidatorPools, getStakedPositions } from "@/lib/staking";

const POLL_INTERVAL = 15_000;

export function useStaking() {
  const onboard = useAuthStore((s) => s.wallet);
  const {
    setPools, setStakedPositions,
    setPoolsLoading, setPoolsError,
    markUpdated,
  } = useEarnStore();

  const fetchStaking = useCallback(async () => {
    if (!onboard) return;
    setPoolsLoading(true);
    try {
      const pools     = await getValidatorPools();
      const positions = await getStakedPositions(onboard.wallet, pools);
      setPools(pools);
      setStakedPositions(positions);
      setPoolsError(null);
      markUpdated();
    } catch (e: unknown) {
      setPoolsError(e instanceof Error ? e.message : String(e));
    } finally {
      setPoolsLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchStaking();
    const id = setInterval(fetchStaking, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStaking]);

  return { refetch: fetchStaking };
}
