import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { getActiveDcaOrders } from "@/lib/dca";

const POLL_INTERVAL = 15_000;

export function useDCA() {
  const onboard = useAuthStore((s) => s.wallet);
  const { setDcaOrders, setDcaLoading, setDcaError } = useEarnStore();

  const fetchOrders = useCallback(async () => {
    if (!onboard) return;
    setDcaLoading(true);
    try {
      const orders = await getActiveDcaOrders(onboard);
      setDcaOrders(orders);
      setDcaError(null);
    } catch (e: unknown) {
      setDcaError(e instanceof Error ? e.message : String(e));
    } finally {
      setDcaLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchOrders]);

  return { refetch: fetchOrders };
}
