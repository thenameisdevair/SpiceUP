"use client";

import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore, type TokenBalance } from "@/stores/wallet";

interface BalancesResponse {
  address: string;
  balances: Record<string, TokenBalance>;
}

export function useBalance() {
  const api = useApiClient();
  const privyUserId = useAuthStore((s) => s.privyUserId);
  const balances = useWalletStore((s) => s.balances);
  const setBalances = useWalletStore((s) => s.setBalances);
  const setLoading = useWalletStore((s) => s.setLoading);
  const setError = useWalletStore((s) => s.setError);
  const markUpdated = useWalletStore((s) => s.markUpdated);

  const query = useQuery({
    queryKey: ["balances", privyUserId],
    enabled: !!privyUserId,
    staleTime: 30_000,
    queryFn: () => api<BalancesResponse>("/api/balances"),
  });
  const { refetch } = query;

  useEffect(() => {
    setLoading(query.isPending || query.isFetching);
    setError(query.error instanceof Error ? query.error.message : null);
  }, [query.error, query.isFetching, query.isPending, setError, setLoading]);

  useEffect(() => {
    if (!query.data?.balances) return;

    setBalances(query.data.balances);
    markUpdated();
  }, [markUpdated, query.data, setBalances]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    balances,
    loading: query.isPending || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
