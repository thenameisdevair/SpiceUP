"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEarnStore } from "@/stores/earn";
import { getActiveDcaOrders } from "@/lib/dca";

/**
 * DCA data hook
 * Polls mock DCA orders
 */
export function useDCA() {
  const orders = useEarnStore((s) => s.dca.orders);
  const loading = useEarnStore((s) => s.dca.loading);
  const error = useEarnStore((s) => s.dca.error);

  const setOrders = useEarnStore((s) => s.setDcaOrders);
  const setLoading = useEarnStore((s) => s.setDcaLoading);
  const setError = useEarnStore((s) => s.setDcaError);

  const initialized = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveDcaOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DCA orders");
    } finally {
      setLoading(false);
    }
  }, [setOrders, setLoading, setError]);

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

  return { orders, loading, error, refresh };
}
