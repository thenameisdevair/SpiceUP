import { Slot } from "expo-router";
import { useEffect } from "react";
import { PrivyProvider } from "@privy-io/expo";
import { ENV } from "@/lib/env";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthInit } from "@/hooks/useAuthInit";
import { initGroupsDb } from "@/lib/groupsCache";
import "../global.css";

function Gate() {
  useAuthGuard();
  useAuthInit();
  useEffect(() => {
    initGroupsDb();
  }, []);
  return <Slot />;
}

export default function RootLayout() {
  return (
    <PrivyProvider appId={ENV.PRIVY_APP_ID} clientId={ENV.PRIVY_CLIENT_ID}>
      <Gate />
    </PrivyProvider>
  );
}
