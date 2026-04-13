"use client";

import { useState, useCallback } from "react";
import { getTxHistory, saveTx, clearHistory, type TxRecord, type TxType } from "@/lib/txHistory";

/** Sample transaction records for demo purposes */
function generateSampleTransactions(): TxRecord[] {
  const now = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;

  const samples: Omit<TxRecord, "id" | "timestamp">[] = [
    {
      type: "receive",
      amount: "0.25",
      token: "ETH",
      counterparty: "0x7a3b...f82d",
      txHash: "0xabc123def456789012345678901234567890abcdef1234567890abcdef123456",
      isPrivate: false,
    },
    {
      type: "send",
      amount: "150",
      token: "STRK",
      counterparty: "0x1c4e...a9b2",
      txHash: null,
      isPrivate: true,
    },
    {
      type: "receive",
      amount: "20",
      token: "USDC",
      counterparty: "0x9f8d...c71e",
      txHash: "0xdef789abc012345678901234567890abcdef1234567890abcdef1234567890ab",
      isPrivate: false,
    },
    {
      type: "send",
      amount: "0.1",
      token: "ETH",
      counterparty: "0x3e7a...d45f",
      txHash: "0x456789abc012345678901234567890abcdef1234567890abcdef123456789abc",
      isPrivate: true,
    },
    {
      type: "receive",
      amount: "500",
      token: "STRK",
      counterparty: "0xb21f...e83c",
      txHash: null,
      isPrivate: true,
    },
    {
      type: "send",
      amount: "10",
      token: "USDC",
      counterparty: "0x5d9c...a2e7",
      txHash: "0x789abc012345678901234567890abcdef1234567890abcdef1234567890abc01",
      isPrivate: false,
    },
  ];

  // Generate timestamps spread over the past few days
  const offsets = [2 * HOUR, 5 * HOUR, 12 * HOUR, 1 * DAY, 2 * DAY, 3 * DAY];

  return samples.map((sample, i) => ({
    ...sample,
    id: `sample_${i}`,
    timestamp: now - offsets[i],
  }));
}

/** Initialize transaction history from localStorage, seeding samples if empty */
function initializeTxHistory(): TxRecord[] {
  const existing = getTxHistory();
  if (existing.length > 0) return existing;

  // Seed sample transactions for demo
  const samples = generateSampleTransactions();
  for (const sample of samples) {
    const { id, timestamp, ...txData } = sample;
    void id;
    void timestamp;
    saveTx(txData);
  }

  // Reload from storage with the correct timestamps from our samples
  const loaded = getTxHistory();
  return loaded.map((tx, i) => ({
    ...tx,
    timestamp: samples[i]?.timestamp ?? tx.timestamp,
  }));
}

/**
 * Transaction History Hook
 * Reads/writes tx records from localStorage.
 * Exposes sorted array (newest first).
 * Generates sample records on first use for demo.
 */
export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<TxRecord[]>(() =>
    initializeTxHistory()
  );

  /** Record a new transaction */
  const recordTx = useCallback(
    (tx: {
      type: TxType;
      amount: string;
      token: string;
      counterparty: string;
      txHash?: string | null;
      isPrivate: boolean;
    }) => {
      const newTx = saveTx(tx);
      setTransactions((prev) => [newTx, ...prev]);
      return newTx;
    },
    []
  );

  /** Clear all history */
  const clearAll = useCallback(() => {
    clearHistory();
    setTransactions([]);
  }, []);

  return {
    transactions,
    loaded: true,
    recordTx,
    clearAll,
  };
}
