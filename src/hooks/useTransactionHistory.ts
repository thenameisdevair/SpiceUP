"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useApiClient } from "@/hooks/useApiClient";
import type { TxRecord, TxType } from "@/lib/txHistory";

interface TransactionsResponse {
  transactions: TxRecord[];
}

export function useTransactionHistory() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const privyUserId = useAuthStore((s) => s.privyUserId);

  const query = useQuery({
    queryKey: ["transactions", privyUserId],
    enabled: !!privyUserId,
    queryFn: () => api<TransactionsResponse>("/api/transactions"),
  });

  const recordTx = useCallback(
    async (tx: {
      type: TxType;
      amount: string;
      token: string;
      counterparty: string;
      txHash?: string | null;
      isPrivate: boolean;
    }) => {
      const response = await api<{ transaction: TxRecord }>("/api/transactions", {
        method: "POST",
        body: tx,
      });

      queryClient.setQueryData<TransactionsResponse | undefined>(
        ["transactions", privyUserId],
        (current) => ({
          transactions: [response.transaction, ...(current?.transactions ?? [])],
        })
      );

      return response.transaction;
    },
    [api, privyUserId, queryClient]
  );

  const clearAll = useCallback(async () => {
    await api("/api/transactions", { method: "DELETE" });
    queryClient.setQueryData<TransactionsResponse>(
      ["transactions", privyUserId],
      { transactions: [] }
    );
  }, [api, privyUserId, queryClient]);

  return {
    transactions: query.data?.transactions ?? [],
    loaded: query.status !== "pending",
    recordTx,
    clearAll,
  };
}
