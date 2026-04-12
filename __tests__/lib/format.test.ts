// __tests__/lib/format.test.ts
import { formatBalance, shortenAddress, toFiat, formatUsdValue } from "@/lib/format";
import { Amount } from "starkzap";
import type { Address } from "starkzap";

describe("formatBalance", () => {
  it("returns em-dash for null", () => {
    expect(formatBalance(null)).toBe("\u2014");
  });

  it("calls toFormatted(true) on the Amount", () => {
    const mockToken = { decimals: 18, name: "T", address: "0x0" as Address, symbol: "T" };
    const amount = Amount.parse("1.5", mockToken);
    const result = formatBalance(amount);
    expect(typeof result).toBe("string");
    expect(result).not.toBe("\u2014");
  });
});

describe("shortenAddress", () => {
  const addr = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("shortens long addresses with default chars=6", () => {
    const result = shortenAddress(addr);
    expect(result).toBe("0x012345...abcdef");
  });

  it("shortens with custom char count", () => {
    const result = shortenAddress(addr, 4);
    expect(result).toBe("0x0123...cdef");
  });

  it("returns short addresses unchanged", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });

  it("returns address unchanged when length equals threshold", () => {
    // chars=6 -> threshold = 6*2 + 2 = 14
    const exact = "0x1234567890ab"; // 14 chars
    expect(shortenAddress(exact)).toBe(exact);
  });
});

describe("toFiat", () => {
  it('returns "$---" for any input (stub)', () => {
    expect(toFiat(null, "ETH")).toBe("$\u2014");
    const mockToken = { decimals: 18, name: "T", address: "0x0" as Address, symbol: "T" };
    expect(toFiat(Amount.parse("100", mockToken), "ETH")).toBe("$\u2014");
  });
});

describe("formatUsdValue", () => {
  it('returns "$---" for undefined', () => {
    expect(formatUsdValue(undefined)).toBe("$\u2014");
  });

  it('returns "$---" for 0n', () => {
    expect(formatUsdValue(0n)).toBe("$\u2014");
  });

  it("formats 1e18-scaled values correctly", () => {
    // 1.5 USD = 1_500_000_000_000_000_000n
    expect(formatUsdValue(1_500_000_000_000_000_000n)).toBe("$1.50");
  });

  it("formats large values", () => {
    // 1234.56 USD
    expect(formatUsdValue(1_234_560_000_000_000_000_000n)).toBe("$1234.56");
  });
});
