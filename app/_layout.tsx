import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { PrivyProvider } from "@privy-io/expo";
import { ENV } from "@/lib/env";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthInit } from "@/hooks/useAuthInit";
import { initGroupsDb } from "@/lib/groupsCache";
import { ToastProvider } from "@/components/Toast";
import "../global.css";

// Prevent splash screen from auto-hiding before fonts are ready.
SplashScreen.preventAutoHideAsync();

function Gate() {
  useAuthGuard();
  useAuthInit();

  useEffect(() => {
    initGroupsDb();
  }, []);

  return (
    <ToastProvider>
      <Slot />
    </ToastProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular":  require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium":   require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold":     require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts resolve (prevents flash of system font).
  if (!fontsLoaded && !fontError) return null;

  return (
    <PrivyProvider appId={ENV.PRIVY_APP_ID} clientId={ENV.PRIVY_CLIENT_ID}>
      <Gate />
    </PrivyProvider>
  );
}
