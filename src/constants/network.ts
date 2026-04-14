/**
 * Starknet network configuration for SpiceUP
 * Runtime-switchable via NEXT_PUBLIC_NETWORK env var.
 */

import { ENV } from "@/lib/env";

export type NetworkConfig = {
  name: "sepolia" | "mainnet";
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  tongoContract: string;
  tokens: {
    STRK: string;
    ETH: string;
    USDC: string;
  };
};

const SEPOLIA: NetworkConfig = {
  name: "sepolia",
  chainId: "SN_SEPOLIA",
  rpcUrl: "",
  explorerUrl: "https://sepolia.starkscan.co",
  tongoContract: "0x0", // Deferred to post-V1
  tokens: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080",
  },
};

const MAINNET: NetworkConfig = {
  name: "mainnet",
  chainId: "SN_MAINNET",
  rpcUrl: "",
  explorerUrl: "https://starkscan.co",
  tongoContract: "0x0", // Deferred to post-V1
  tokens: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  },
};

const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: SEPOLIA,
  mainnet: MAINNET,
};

/**
 * Returns the active network config.
 * Uses explicit RPC env vars only. Live execution should not silently fall
 * back to stale public endpoints.
 */
export function getNetwork(): NetworkConfig {
  const net = NETWORKS[ENV.NETWORK] ?? SEPOLIA;
  const networkSpecificRpc =
    net.name === "mainnet" ? ENV.RPC_URL_MAINNET : ENV.RPC_URL_SEPOLIA;
  const rpcUrl = networkSpecificRpc || ENV.RPC_URL || net.rpcUrl;

  return { ...net, rpcUrl };
}

/** Current active network (convenience export) */
export const NETWORK = getNetwork();
