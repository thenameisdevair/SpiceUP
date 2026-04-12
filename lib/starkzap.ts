// SDK singleton + wallet initialization.
// Heavy imports (starkzap-native, starknet) are lazy-loaded via require() so the
// full module chain is only evaluated after login, not at app startup.
import { NETWORK } from "@/constants/network";
import type { OnboardPrivyResolveResult } from "starkzap";

let sdkInstance: any = null;
let _provider: any = null;

export function getProvider() {
  if (!_provider) {
    const { RpcProvider } = require("starknet") as typeof import("starknet");
    _provider = new RpcProvider({ nodeUrl: NETWORK.rpcUrl });
  }
  return _provider;
}

export function getSdk() {
  if (!sdkInstance) {
    const { StarkZap } = require("starkzap-native") as typeof import("starkzap-native");
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
