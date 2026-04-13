"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { loadSession, type MockSession } from "@/lib/mockAuth";
import { storageGet } from "@/lib/storage";

/**
 * On mount, checks localStorage for an existing auth session.
 * If found, restores session data into the Zustand auth store.
 * If not found, stays logged out.
 *
 * Must be called once at the app root level (AppLayout).
 */
export function useAuthInit() {
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setStatus = useAuthStore((s) => s.setStatus);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      setStatus("initializing");

      try {
        const session: MockSession | null = await loadSession();

        if (session) {
          // Also load the Tongo private key separately
          const tongoKey = await storageGet("spiceup.tongo.privateKey");

          setIdentity({
            privyUserId: session.privyUserId,
            starknetAddress: session.starknetAddress,
            tongoRecipientId: session.tongoRecipientId,
            wallet: null, // Mock — no real wallet
            tongo: tongoKey
              ? { privateKey: tongoKey }
              : null, // Store key reference
            displayName: session.displayName,
            phoneNumber: session.phoneNumber,
          });
        } else {
          setStatus("idle");
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        setStatus("error", "Failed to restore session");
      }
    }

    init();
  }, [setIdentity, setStatus]);
}
