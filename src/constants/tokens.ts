/**
 * Token definitions for SpiceUP
 * STRK, ETH, USDC supported for both public and confidential transfers
 */

export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string; // emoji or SVG path for display
}

import { NETWORK } from "@/constants/network";

export const STRK: TokenConfig = {
  symbol: "STRK",
  name: "Starknet Token",
  address: NETWORK.tokens.STRK,
  decimals: 18,
  icon: "⚡",
};

export const ETH: TokenConfig = {
  symbol: "ETH",
  name: "Ether",
  address: NETWORK.tokens.ETH,
  decimals: 18,
  icon: "⟠",
};

export const USDC: TokenConfig = {
  symbol: "USDC",
  name: "USD Coin",
  address: NETWORK.tokens.USDC,
  decimals: 6,
  icon: "$",
};

export const ALL_TOKENS: TokenConfig[] = [ETH, STRK, USDC];

export const TOKEN_BY_SYMBOL: Record<string, TokenConfig> = {
  STRK,
  ETH,
  USDC,
};
