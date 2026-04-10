// SDK singleton + wallet initialization.
// API shapes verified against node_modules/starkzap/dist/src/*.d.ts
import { StarkZap } from "starkzap-native";
import { RpcProvider } from "starknet";
import { NETWORK } from "@/constants/network";
import type { OnboardPrivyResolveResult } from "starkzap";

let sdkInstance: StarkZap | null = null;
export const provider = new RpcProvider({ nodeUrl: NETWORK.rpcUrl });

export function getSdk(): StarkZap {
  if (!sdkInstance) {
    sdkInstance = new StarkZap({ network: NETWORK.name });
  }
  return sdkInstance;
}

// Called from hooks/useAuthInit.ts after Privy reports a Starknet wallet is ready.
// The resolve function is built by lib/privy-signer.ts.
export async function initWallet(resolve: () => Promise<OnboardPrivyResolveResult>) {
  const sdk = getSdk();
  const result = await sdk.onboard({
    strategy: "privy",
    privy: { resolve },
    deploy: "if_needed",
  });
  return result;
}
