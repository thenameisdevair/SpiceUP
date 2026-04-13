/**
 * Tongo Helper Module
 * Parses Tongo QR/address format ("tongo:x:y") and provides mock functions
 * for confidential payment operations (fund, send, withdraw, ragequit).
 */

export interface TongoAddress {
  x: bigint;
  y: bigint;
}

/**
 * Parse a Tongo address string in "tongo:x:y" format.
 * Returns parsed coordinates or null if invalid.
 */
export function parseTongoQr(input: string): TongoAddress | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase();
  if (!trimmed.startsWith("tongo:")) return null;

  const parts = trimmed.slice(6).split(":");
  if (parts.length !== 2) return null;

  try {
    const x = BigInt(parts[0]);
    const y = BigInt(parts[1]);
    if (x < 0n || y < 0n) return null;
    return { x, y };
  } catch {
    return null;
  }
}

/**
 * Validate whether an input string is a valid Tongo address.
 */
export function isValidTongoAddress(input: string): boolean {
  return parseTongoQr(input) !== null;
}

/**
 * Format a parsed Tongo address back to string form for display.
 */
export function formatTongoAddress(addr: TongoAddress): string {
  return `tongo:${addr.x.toString()}:${addr.y.toString()}`;
}

/**
 * Shorten a Tongo address for display (first 8 + last 6 chars of the x component).
 */
export function shortenTongoAddress(input: string, chars: number = 6): string {
  if (!input || !input.startsWith("tongo:")) return "—";
  const payload = input.slice(6); // remove "tongo:"
  if (payload.length <= chars * 2 + 3) return input; // 3 for the ":" separator
  const xPart = payload.split(":")[0] ?? "";
  if (xPart.length <= chars * 2 + 2) return input;
  return `tongo:${xPart.slice(0, chars + 2)}...${xPart.slice(-chars)}:...`;
}

// ─── Mock Confidential Operations ──────────────────────────────────────────────

/**
 * Mock delay helper to simulate blockchain operations.
 */
function mockDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock fund operation: move tokens from public wallet to confidential balance.
 * Creates a "fund" transaction record in history.
 */
export async function mockFundConfidential(params: {
  amount: string;
  token: string;
  recordTx: (tx: {
    type: "fund";
    amount: string;
    token: string;
    counterparty: string;
    txHash?: string | null;
    isPrivate: boolean;
  }) => void;
}): Promise<{ success: boolean; txHash: string }> {
  // Simulate on-chain delay
  await mockDelay(2000);

  const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

  params.recordTx({
    type: "fund",
    amount: params.amount,
    token: params.token,
    counterparty: "self",
    txHash,
    isPrivate: false,
  });

  return { success: true, txHash };
}

/**
 * Mock private send: send tokens privately via Tongo ZK proof.
 * Creates a "send" transaction record with isPrivate: true.
 */
export async function mockSendPrivate(params: {
  amount: string;
  token: string;
  recipient: string;
  recordTx: (tx: {
    type: "send";
    amount: string;
    token: string;
    counterparty: string;
    txHash?: string | null;
    isPrivate: boolean;
  }) => void;
}): Promise<{ success: boolean; txHash: string | null }> {
  // Simulate ZK proof generation
  await mockDelay(1500);

  // Simulate on-chain verification
  await mockDelay(1000);

  // Private txs have no visible txHash
  params.recordTx({
    type: "send",
    amount: params.amount,
    token: params.token,
    counterparty: params.recipient,
    txHash: null,
    isPrivate: true,
  });

  return { success: true, txHash: null };
}

/**
 * Mock withdraw: move tokens from confidential balance to public wallet.
 * Creates a "withdraw" transaction record in history.
 */
export async function mockWithdrawConfidential(params: {
  amount: string;
  token: string;
  recordTx: (tx: {
    type: "withdraw";
    amount: string;
    token: string;
    counterparty: string;
    txHash?: string | null;
    isPrivate: boolean;
  }) => void;
}): Promise<{ success: boolean; txHash: string }> {
  // Simulate on-chain delay
  await mockDelay(2000);

  const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

  params.recordTx({
    type: "withdraw",
    amount: params.amount,
    token: params.token,
    counterparty: "self",
    txHash,
    isPrivate: false,
  });

  return { success: true, txHash };
}

/**
 * Mock ragequit: emergency withdraw ALL confidential balance to public wallet.
 * Creates a "withdraw" transaction record for the full amount.
 */
export async function mockRagequit(params: {
  totalBalance: string;
  token: string;
  recordTx: (tx: {
    type: "withdraw";
    amount: string;
    token: string;
    counterparty: string;
    txHash?: string | null;
    isPrivate: boolean;
  }) => void;
}): Promise<{ success: boolean; txHash: string }> {
  // Simulate emergency exit (longer delay)
  await mockDelay(3000);

  const txHash = `0xragequit_${Date.now().toString(16)}`;

  params.recordTx({
    type: "withdraw",
    amount: params.totalBalance,
    token: params.token,
    counterparty: "self (ragequit)",
    txHash,
    isPrivate: false,
  });

  return { success: true, txHash };
}
