/**
 * Format utilities for SpiceUP
 * Balance display, address shortening, fiat stubs
 */

/**
 * Format a token balance string to 4 decimal places.
 * Handles null/undefined gracefully.
 */
export function formatBalance(amount: string | null | undefined): string {
  if (!amount || amount === "" || amount === "0") return "0.0000";
  const num = parseFloat(amount);
  if (isNaN(num)) return "0.0000";
  // Show up to 4 decimal places, strip trailing zeros but keep at least 4
  const formatted = num.toFixed(4);
  return formatted;
}

/**
 * Shorten a hex address for display.
 * "0x1234567890abcdef..." → "0x1234...cdef"
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return "—";
  if (address.length <= chars * 2 + 4) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Stub for fiat value conversion.
 * Returns "$—" for now since no price oracle is connected.
 */
export function toFiat(amount: string | null | undefined, token: string): string {
  if (!amount || amount === "" || amount === "0") return "$0.00";
  // Stub — will be connected to price feed later
  return "$—";
}

/**
 * Format a raw value that's scaled by 1e18 (like Solidity uint256 for 18-decimal tokens).
 * e.g., 500000000000000000n → "0.5000"
 */
export function formatUsdValue(raw1e18: bigint | undefined): string {
  if (raw1e18 === undefined || raw1e18 === null) return "0.0000";
  const divisor = BigInt(1_000_000_000_000_000_000); // 1e18
  const intPart = raw1e18 / divisor;
  const fracPart = raw1e18 % divisor;

  // Format fractional part to 4 decimal places
  const fracStr = (Number(fracPart) / Number(divisor)).toFixed(4).slice(2);
  return `${intPart}.${fracStr}`;
}

/**
 * Format a timestamp to a relative or readable time string.
 */
export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const date = new Date(ts);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
