import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { usePrivy } from "@privy-io/expo";

export function useAuthGuard() {
  const { user, isReady } = usePrivy();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) router.replace("/(auth)/login");
    else if (user && inAuthGroup) router.replace("/(app)/home");
  }, [isReady, user, segments]);
}
