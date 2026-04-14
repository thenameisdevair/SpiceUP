"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getPrivyDisplayName,
  getPrivyEmail,
  getPrivyPhone,
  getStoredPhoneNumber,
  getWalletAddress,
} from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { STORAGE_KEYS, storageGet } from "@/lib/storage";
import { useAuthStore } from "@/stores/auth";

/**
 * Syncs Privy's authenticated user state into the local Zustand auth store.
 * This replaces the old demo-only local session restoration path.
 */
export function useAuthInit() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const patchProfile = useAuthStore((s) => s.patchProfile);
  const setStatus = useAuthStore((s) => s.setStatus);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    if (!ready || !walletsReady) {
      setStatus("initializing");
      return;
    }

    if (!authenticated || !user) {
      reset();
      return;
    }

    let cancelled = false;

    async function syncIdentity() {
      try {
        const [storedPhoneNumber, storedTongoKey] = await Promise.all([
          getStoredPhoneNumber(),
          storageGet(STORAGE_KEYS.tongoPrivateKey),
        ]);

        if (cancelled) return;

        const privyUser = user as unknown as { id?: string };
        const walletAddress = getWalletAddress(user, wallets);
        const activeWallet = Array.isArray(wallets) ? wallets[0] ?? null : null;
        const email = getPrivyEmail(user);
        const displayName = getPrivyDisplayName(user);
        const phoneNumber = storedPhoneNumber ?? getPrivyPhone(user);

        if (!privyUser.id) {
          setStatus("error", "Authenticated session is missing a Privy user ID");
          return;
        }

        setIdentity({
          privyUserId: privyUser.id,
          starknetAddress: walletAddress,
          tongoRecipientId: null,
          wallet: activeWallet,
          tongo: storedTongoKey ? { privateKey: storedTongoKey } : null,
          email,
          displayName,
          phoneNumber,
        });

        try {
          const accessToken = await getAccessToken();
          const response = await apiFetch<{
            user: {
              email: string | null;
              displayName: string | null;
              phoneNumber: string | null;
              starknetAddress: string | null;
              tongoRecipientId: string | null;
            };
          }>("/api/users/sync", {
            method: "POST",
            accessToken,
            auth: {
              privyUserId: privyUser.id,
              email,
              displayName,
              phoneNumber,
              starknetAddress: walletAddress,
            },
          });

          if (cancelled) return;

          patchProfile({
            email: response.user.email,
            displayName: response.user.displayName,
            phoneNumber: response.user.phoneNumber,
            tongoRecipientId: response.user.tongoRecipientId,
          });
        } catch (syncError) {
          console.error("User sync failed:", syncError);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        setStatus("error", "Failed to restore session");
      }
    }

    void syncIdentity();

    return () => {
      cancelled = true;
    };
  }, [
    authenticated,
    ready,
    reset,
    patchProfile,
    setIdentity,
    setStatus,
    user,
    wallets,
    walletsReady,
    getAccessToken,
  ]);
}
