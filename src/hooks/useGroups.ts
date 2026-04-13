"use client";

import { useEffect } from "react";
import { useGroupsStore } from "@/stores/groups";
import { MOCK_GROUPS, MOCK_EXPENSES, MOCK_SETTLEMENTS } from "@/lib/groups";

export function useGroups() {
  const groups = useGroupsStore((s) => s.groups);
  const loading = useGroupsStore((s) => s.loading);
  const error = useGroupsStore((s) => s.error);
  const setGroups = useGroupsStore((s) => s.setGroups);
  const setLoading = useGroupsStore((s) => s.setLoading);
  const setError = useGroupsStore((s) => s.setError);
  const setExpenses = useGroupsStore((s) => s.setExpenses);
  const addGroup = useGroupsStore((s) => s.addGroup);

  useEffect(() => {
    // Only load mock data once
    if (groups.length > 0) return;

    setLoading(true);
    try {
      // Simulate async loading
      setTimeout(() => {
        setGroups(MOCK_GROUPS);
        setExpenses(MOCK_EXPENSES);
        // settlements stay empty initially
      }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    }
  }, [groups.length, setGroups, setExpenses, setLoading, setError]);

  return { groups, loading, error, addGroup };
}
