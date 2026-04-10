import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { NETWORK } from "@/constants/network";

export function useConfidentialBalance() {
  const tongo = useAuthStore((s) => s.tongo);
  const onboard = useAuthStore((s) => s.wallet);
  const { setConfidential, setConfidentialUnavailable } = useWalletStore();
  const confidential = useWalletStore((s) => s.confidential);

  const fetchState = useCallback(async () => {
    if (!tongo) return;
    // Guard: if tongo contract is placeholder, skip
    if (NETWORK.tongoContract === "0x0") {
      setConfidentialUnavailable();
      return;
    }
    try {
      const state = await tongo.getState();
      setConfidential(state);
    } catch (e) {
      // Silently fail — confidential balance is non-critical for Cat 3
      console.warn("Failed to fetch confidential state:", e);
    }
  }, [tongo]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const needsRollover = confidential ? confidential.pending > 0n : false;

  const rollover = useCallback(async () => {
    if (!tongo || !onboard || !confidential || confidential.pending === 0n) return;
    const wallet = onboard.wallet;
    const calls = await tongo.rollover({ sender: wallet.address });
    const tx = await wallet.execute(calls);
    await tx.wait();
    // Refresh state after rollover
    await fetchState();
    return tx;
  }, [tongo, onboard, confidential, fetchState]);

  return { refetch: fetchState, needsRollover, rollover };
}
