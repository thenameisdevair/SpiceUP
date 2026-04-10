import { Slot } from "expo-router";
import { PrivyProvider } from "@privy-io/expo";
import { ENV } from "@/lib/env";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthInit } from "@/hooks/useAuthInit";
import "../global.css";

function Gate() {
  useAuthGuard();
  useAuthInit();
  return <Slot />;
}

export default function RootLayout() {
  return (
    <PrivyProvider appId={ENV.PRIVY_APP_ID} clientId={ENV.PRIVY_CLIENT_ID}>
      <Gate />
    </PrivyProvider>
  );
}
