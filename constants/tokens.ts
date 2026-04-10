import type { Token, Address } from "starkzap";
import { NETWORK } from "@/constants/network";

export const STRK: Token = {
  name: "Starknet Token",
  address: NETWORK.tokens.STRK as Address,
  decimals: 18,
  symbol: "STRK",
};

export const ETH: Token = {
  name: "Ether",
  address: NETWORK.tokens.ETH as Address,
  decimals: 18,
  symbol: "ETH",
};

export const USDC: Token = {
  name: "USD Coin",
  address: NETWORK.tokens.USDC as Address,
  decimals: 6,
  symbol: "USDC",
};

/** All supported tokens, in display order. */
export const ALL_TOKENS: Token[] = [ETH, STRK, USDC];

/** Lookup by symbol. */
export const TOKEN_BY_SYMBOL: Record<string, Token> = {
  STRK,
  ETH,
  USDC,
};

/** Reverse lookup by lowercase address — used by DCA to resolve token addresses. */
export const TOKEN_BY_ADDRESS: Record<string, Token> = Object.fromEntries(
  ALL_TOKENS.map((t) => [t.address.toLowerCase(), t])
);
