// __tests__/constants/tokens.test.ts
import {
  STRK,
  ETH,
  USDC,
  ALL_TOKENS,
  TOKEN_BY_SYMBOL,
  TOKEN_BY_ADDRESS,
} from "@/constants/tokens";
import { NETWORK } from "@/constants/network";

describe("Token definitions", () => {
  it("STRK has correct fields", () => {
    expect(STRK.symbol).toBe("STRK");
    expect(STRK.decimals).toBe(18);
    expect(STRK.name).toBe("Starknet Token");
    expect(STRK.address).toBe(NETWORK.tokens.STRK);
  });

  it("ETH has correct fields", () => {
    expect(ETH.symbol).toBe("ETH");
    expect(ETH.decimals).toBe(18);
    expect(ETH.name).toBe("Ether");
    expect(ETH.address).toBe(NETWORK.tokens.ETH);
  });

  it("USDC has correct fields", () => {
    expect(USDC.symbol).toBe("USDC");
    expect(USDC.decimals).toBe(6);
    expect(USDC.name).toBe("USD Coin");
    expect(USDC.address).toBe(NETWORK.tokens.USDC);
  });
});

describe("ALL_TOKENS", () => {
  it("has exactly 3 entries in order [ETH, STRK, USDC]", () => {
    expect(ALL_TOKENS).toHaveLength(3);
    expect(ALL_TOKENS[0].symbol).toBe("ETH");
    expect(ALL_TOKENS[1].symbol).toBe("STRK");
    expect(ALL_TOKENS[2].symbol).toBe("USDC");
  });
});

describe("TOKEN_BY_SYMBOL", () => {
  it("looks up STRK by symbol", () => {
    expect(TOKEN_BY_SYMBOL["STRK"]).toBe(STRK);
  });

  it("looks up ETH by symbol", () => {
    expect(TOKEN_BY_SYMBOL["ETH"]).toBe(ETH);
  });

  it("returns undefined for nonexistent symbol", () => {
    expect(TOKEN_BY_SYMBOL["NONEXISTENT"]).toBeUndefined();
  });
});

describe("TOKEN_BY_ADDRESS", () => {
  it("looks up STRK by lowercase address", () => {
    expect(TOKEN_BY_ADDRESS[STRK.address.toLowerCase()]).toBe(STRK);
  });

  it("all keys are lowercase", () => {
    for (const key of Object.keys(TOKEN_BY_ADDRESS)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
