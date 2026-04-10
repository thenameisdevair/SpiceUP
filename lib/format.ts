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
