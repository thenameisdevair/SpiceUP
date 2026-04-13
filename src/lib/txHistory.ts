/**
 * Transaction History Module
 * Stores transaction records in localStorage (key: "spiceup.txHistory")
 * Capped at 200 records, sorted newest first
 */

export type TxType =
  | "send"
  | "receive"
  | "fund"
  | "withdraw"
  | "stake"
  | "unstake"
  | "claim_rewards"
  | "dca_create"
  | "lend_deposit"
  | "lend_withdraw";

export interface TxRecord {
  id: string;
  type: TxType;
  amount: string;
  token: string;
  counterparty: string;
  timestamp: number;
  txHash: string | null;
  isPrivate: boolean;
}

const STORAGE_KEY = "spiceup.txHistory";
const MAX_RECORDS = 200;

function generateId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Get all transaction records sorted newest first */
export function getTxHistory(): TxRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records: TxRecord[] = JSON.parse(raw);
    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/** Save a new transaction record. Returns the created record. */
export function saveTx(tx: Omit<TxRecord, "id" | "timestamp">): TxRecord {
  const records = getTxHistory();
  const newTx: TxRecord = {
    ...tx,
    id: generateId(),
    timestamp: Date.now(),
  };

  // Insert at beginning (newest first), cap at MAX_RECORDS
  records.unshift(newTx);
  const trimmed = records.slice(0, MAX_RECORDS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full
  }

  return newTx;
}

/** Clear all transaction history */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
