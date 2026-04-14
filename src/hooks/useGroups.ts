"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { useApiClient } from "@/hooks/useApiClient";
import type { Group, Expense, Settlement } from "@/lib/groups";

interface GroupsResponse {
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
}

interface CreateGroupInput {
  name: string;
  members: Array<{
    name: string;
    color: string;
    walletAddress?: string;
  }>;
}

export function useGroups() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const privyUserId = useAuthStore((s) => s.privyUserId);

  const groups = useGroupsStore((s) => s.groups);
  const error = useGroupsStore((s) => s.error);
  const setGroups = useGroupsStore((s) => s.setGroups);
  const addGroup = useGroupsStore((s) => s.addGroup);
  const setExpenses = useGroupsStore((s) => s.setExpenses);
  const setSettlements = useGroupsStore((s) => s.setSettlements);
  const setError = useGroupsStore((s) => s.setError);
  const resetData = useGroupsStore((s) => s.resetData);

  const query = useQuery({
    queryKey: ["groups", privyUserId],
    enabled: !!privyUserId,
    queryFn: () => api<GroupsResponse>("/api/groups"),
  });

  useEffect(() => {
    if (!privyUserId) {
      resetData();
      return;
    }

    if (query.data) {
      setGroups(query.data.groups);
      setExpenses(query.data.expenses);
      setSettlements(query.data.settlements);
    }
  }, [
    privyUserId,
    query.data,
    resetData,
    setExpenses,
    setGroups,
    setSettlements,
  ]);

  useEffect(() => {
    if (query.error instanceof Error) {
      setError(query.error.message);
    }
  }, [query.error, setError]);

  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      const response = await api<{ group: Group }>("/api/groups", {
        method: "POST",
        body: input,
      });

      addGroup(response.group);
      void queryClient.invalidateQueries({ queryKey: ["groups", privyUserId] });
      return response.group;
    },
    [addGroup, api, privyUserId, queryClient]
  );

  return {
    groups,
    loading: query.isLoading,
    error,
    createGroup,
    refetch: query.refetch,
  };
}
