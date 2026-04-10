import type { Amount } from "starkzap";

/** Compressed formatted balance (max 4 decimal places). */
export function formatBalance(amount: Amount | null): string {
  if (!amount) return "\u2014";
  return amount.toFormatted(true);
}

/** Shorten a hex address: 0x1234...abcd */
export function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Placeholder fiat conversion — returns "$—" until Cat 6 adds a price feed. */
export function toFiat(_amount: Amount | null, _token: string): string {
  return "$\u2014";
}

/**
 * Format a 1e18-scaled bigint USD value (from Vesu LendingUserPosition.collateral.usdValue).
 * Returns "$—" when value is undefined or zero.
 */
export function formatUsdValue(raw1e18: bigint | undefined): string {
  if (raw1e18 === undefined || raw1e18 === 0n) return "$\u2014";
  const usd = Number(raw1e18) / 1e18;
  return `$${usd.toFixed(2)}`;
}
