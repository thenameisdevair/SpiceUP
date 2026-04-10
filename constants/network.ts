import { ENV } from "@/lib/env";

type NetworkConfig = {
  name: "sepolia" | "mainnet";
  chainId: "SN_SEPOLIA" | "SN_MAINNET";
  rpcUrl: string;
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
  rpcUrl: "https://alpha-sepolia.starknet.io",
  tongoContract: "0x0", // TODO: fill from Tongo docs when available
  tokens: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x0", // TODO: sepolia USDC address
  },
};

const MAINNET: NetworkConfig = {
  name: "mainnet",
  chainId: "SN_MAINNET",
  rpcUrl: "https://alpha-mainnet.starknet.io",
  tongoContract: "0x0", // TODO
  tokens: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  },
};

export const NETWORK: NetworkConfig = ENV.NETWORK === "mainnet" ? MAINNET : SEPOLIA;
