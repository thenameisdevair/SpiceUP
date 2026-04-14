"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Waits briefly for a client SDK readiness flag to become true instead of
 * forcing the UI to stay disabled the whole time.
 */
export function useReadyGate(ready: boolean) {
  const readyRef = useRef(ready);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  return useCallback(async (timeoutMs = 6000, intervalMs = 150) => {
    if (readyRef.current) return true;

    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (readyRef.current) return true;
    }

    return readyRef.current;
  }, []);
}
