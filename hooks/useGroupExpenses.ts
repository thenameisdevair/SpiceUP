import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/auth";
import { getExpenses, getSettlements, calcNetBalances } from "@/lib/groups";
import { cacheExpenses, getCachedExpenses } from "@/lib/groupsCache";
import type { Expense, Settlement, NetBalance } from "@/lib/groups";

export function useGroupExpenses(groupId: string) {
  const { privyUserId } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    // Serve cache first for instant render
    const cached = getCachedExpenses(groupId);
    if (cached.length > 0) setExpenses(cached);

    setLoading(true);
    try {
      const [freshExp, freshSettle] = await Promise.all([
        getExpenses(groupId),
        getSettlements(groupId),
      ]);
      setExpenses(freshExp);
      setSettlements(freshSettle);
      cacheExpenses(groupId, freshExp);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  const netBalances: NetBalance[] = useMemo(
    () =>
      privyUserId ? calcNetBalances(expenses, settlements, privyUserId) : [],
    [expenses, settlements, privyUserId]
  );

  return { expenses, settlements, netBalances, loading, refresh: fetch };
}
