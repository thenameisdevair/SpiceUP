"use client";

import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useApiClient } from "@/hooks/useApiClient";
import { useGroups } from "@/hooks/useGroups";
import { useGroupsStore } from "@/stores/groups";
import {
  calcNetBalances,
  type Group,
  type NetBalance,
  type Expense,
  type Settlement,
} from "@/lib/groups";

export function useGroupExpenses(groupId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const privyUserId = useAuthStore((s) => s.privyUserId);
  const { loading, error } = useGroups();

  const groups = useGroupsStore((s) => s.groups);
  const allExpenses = useGroupsStore((s) => s.expenses);
  const allSettlements = useGroupsStore((s) => s.settlements);
  const addSettlementToStore = useGroupsStore((s) => s.addSettlement);
  const addExpenseToStore = useGroupsStore((s) => s.addExpense);

  const group: Group | null = useMemo(
    () => groups.find((candidate) => candidate.id === groupId) ?? null,
    [groupId, groups]
  );

  const expenses: Expense[] = useMemo(
    () => allExpenses.filter((expense) => expense.groupId === groupId),
    [allExpenses, groupId]
  );

  const settlements: Settlement[] = useMemo(
    () => allSettlements.filter((settlement) => settlement.groupId === groupId),
    [allSettlements, groupId]
  );

  const netBalances: NetBalance[] = useMemo(
    () => calcNetBalances(expenses, settlements),
    [expenses, settlements]
  );

  const members = group?.members ?? [];

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "createdAt"> & Partial<Pick<Expense, "id" | "createdAt">>) => {
      const response = await api<{ expense: Expense }>(
        `/api/groups/${groupId}/expenses`,
        {
          method: "POST",
          body: {
            description: expense.description,
            amount: expense.amount,
            token: expense.token,
            paidBy: expense.paidBy,
            splitMode: expense.splitMode,
            splits: expense.splits,
          },
        }
      );

      addExpenseToStore(response.expense);
      void queryClient.invalidateQueries({ queryKey: ["groups", privyUserId] });
      return response.expense;
    },
    [addExpenseToStore, api, groupId, privyUserId, queryClient]
  );

  const addSettlement = useCallback(
    async (
      settlement: Omit<Settlement, "id" | "createdAt"> &
        Partial<Pick<Settlement, "id" | "createdAt">>
    ) => {
      const response = await api<{ settlement: Settlement }>(
        `/api/groups/${groupId}/settlements`,
        {
          method: "POST",
          body: {
            fromMemberId: settlement.fromMemberId,
            toMemberId: settlement.toMemberId,
            amount: settlement.amount,
            token: settlement.token,
            isPrivate: settlement.isPrivate,
          },
        }
      );

      addSettlementToStore(response.settlement);
      void queryClient.invalidateQueries({ queryKey: ["groups", privyUserId] });
      return response.settlement;
    },
    [addSettlementToStore, api, groupId, privyUserId, queryClient]
  );

  return {
    group,
    expenses,
    settlements,
    netBalances,
    members,
    addExpense,
    addSettlement,
    loading,
    error,
  };
}
