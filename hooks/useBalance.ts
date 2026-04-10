import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { ALL_TOKENS } from "@/constants/tokens";

const POLL_INTERVAL = 15_000; // 15 seconds

export function useBalance() {
  const onboard = useAuthStore((s) => s.wallet);
  const { setBalance, setLoading, setError, markUpdated } = useWalletStore();

  const fetchBalances = useCallback(async () => {
    if (!onboard) return;
    const wallet = onboard.wallet;
    try {
      setLoading(true);
      const results = await Promise.allSettled(
        ALL_TOKENS.map((token) => wallet.balanceOf(token))
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          setBalance(ALL_TOKENS[i].symbol, result.value);
        }
      });
      markUpdated();
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchBalances();
    const id = setInterval(fetchBalances, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBalances]);

  return { refetch: fetchBalances };
}
