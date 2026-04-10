import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { getLendingMarkets, getLendingPositions } from "@/lib/lending";

const POLL_INTERVAL = 15_000;

export function useLending() {
  const onboard = useAuthStore((s) => s.wallet);
  const {
    setLendingPositions, setLendingMarkets,
    setLendingLoading, setLendingError,
  } = useEarnStore();

  const fetchLending = useCallback(async () => {
    if (!onboard) return;
    setLendingLoading(true);
    try {
      const markets   = await getLendingMarkets(onboard);
      const positions = await getLendingPositions(onboard, markets);
      setLendingMarkets(markets);
      setLendingPositions(positions);
      setLendingError(null);
    } catch (e: unknown) {
      setLendingError(e instanceof Error ? e.message : String(e));
    } finally {
      setLendingLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchLending();
    const id = setInterval(fetchLending, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchLending]);

  return { refetch: fetchLending };
}
