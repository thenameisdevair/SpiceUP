import { useEffect, useCallback, useState } from "react";
import { Alert } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { NETWORK } from "@/constants/network";

const POLL_INTERVAL = 15_000;

export function useConfidentialBalance() {
  const tongo = useAuthStore((s) => s.tongo);
  const onboard = useAuthStore((s) => s.wallet);
  const { setConfidential, setConfidentialUnavailable } = useWalletStore();
  const confidential = useWalletStore((s) => s.confidential);
  const [rollingOver, setRollingOver] = useState(false);

  const fetchState = useCallback(async () => {
    if (!tongo) return;
    if (NETWORK.tongoContract === "0x0") {
      setConfidentialUnavailable();
      return;
    }
    try {
      const state = await tongo.getState();
      setConfidential(state);
    } catch (e) {
      console.warn("Failed to fetch confidential state:", e);
    }
  }, [tongo]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchState]);

  const needsRollover = confidential ? confidential.pending > 0n : false;

  const rollover = useCallback(async () => {
    if (!tongo || !onboard || !confidential || confidential.pending === 0n) return;
    setRollingOver(true);
    try {
      const wallet = onboard.wallet;
      const calls = await tongo.rollover({ sender: wallet.address });
      const tx = await wallet.execute(calls);
      await tx.wait();
      await fetchState();
      return tx;
    } catch (e: any) {
      Alert.alert("Rollover failed", e.message ?? String(e));
    } finally {
      setRollingOver(false);
    }
  }, [tongo, onboard, confidential, fetchState]);

  return { refetch: fetchState, needsRollover, rollover, rollingOver };
}
