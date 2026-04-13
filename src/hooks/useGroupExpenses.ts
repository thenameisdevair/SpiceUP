"use client";

import { useMemo } from "react";
import { useGroupsStore } from "@/stores/groups";
import { calcNetBalances, getGroupMembers, type NetBalance, type Expense, type Settlement } from "@/lib/groups";

export function useGroupExpenses(groupId: string) {
  const allExpenses = useGroupsStore((s) => s.expenses);
  const allSettlements = useGroupsStore((s) => s.settlements);
  const addSettlement = useGroupsStore((s) => s.addSettlement);
  const addExpense = useGroupsStore((s) => s.addExpense);

  const expenses: Expense[] = useMemo(
    () => allExpenses.filter((e) => e.groupId === groupId),
    [allExpenses, groupId],
  );

  const settlements: Settlement[] = useMemo(
    () => allSettlements.filter((s) => s.groupId === groupId),
    [allSettlements, groupId],
  );

  const netBalances: NetBalance[] = useMemo(
    () => calcNetBalances(expenses, settlements),
    [expenses, settlements],
  );

  const members = useMemo(() => getGroupMembers(groupId), [groupId]);

  return {
    expenses,
    settlements,
    netBalances,
    members,
    addExpense,
    addSettlement,
  };
}
