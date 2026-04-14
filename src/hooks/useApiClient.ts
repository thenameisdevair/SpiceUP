"use client";

import { useCallback } from "react";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth";

export function useApiClient() {
  const { getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const privyUserId = useAuthStore((s) => s.privyUserId);
  const email = useAuthStore((s) => s.email);
  const displayName = useAuthStore((s) => s.displayName);
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);

  return useCallback(
    async <T>(input: string, init?: Parameters<typeof apiFetch<T>>[1]) => {
      const accessToken = await getAccessToken();

      return apiFetch<T>(input, {
        ...init,
        accessToken,
        auth: {
          privyUserId,
          identityToken,
          email,
          displayName,
          phoneNumber,
          starknetAddress,
          tongoRecipientId,
        },
      });
    },
    [
      displayName,
      email,
      getAccessToken,
      identityToken,
      phoneNumber,
      privyUserId,
      starknetAddress,
      tongoRecipientId,
    ]
  );
}
