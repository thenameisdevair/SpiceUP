import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Group, Expense, Settlement } from "@/lib/groups";

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;

  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  resetData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Also store expenses/settlements here so mutations persist across pages
interface ExpensesState {
  expenses: Expense[];
  settlements: Settlement[];

  setExpenses: (expenses: Expense[]) => void;
  setSettlements: (settlements: Settlement[]) => void;
  addExpense: (expense: Expense) => void;
  addSettlement: (settlement: Settlement) => void;
}

export const useGroupsStore = create<GroupsState & ExpensesState>()(
  persist(
    (set) => ({
      groups: [],
      loading: false,
      error: null,
      setGroups: (groups) => set({ groups, loading: false, error: null }),
      addGroup: (group) =>
        set((state) => ({ groups: [...state.groups, group] })),
      resetData: () =>
        set({
          groups: [],
          expenses: [],
          settlements: [],
          loading: false,
          error: null,
        }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),

      expenses: [],
      settlements: [],
      setExpenses: (expenses) => set({ expenses }),
      setSettlements: (settlements) => set({ settlements }),
      addExpense: (expense) =>
        set((state) => ({ expenses: [expense, ...state.expenses] })),
      addSettlement: (settlement) =>
        set((state) => ({ settlements: [...state.settlements, settlement] })),
    }),
    {
      name: "spiceup.groups",
      partialize: (state) => ({
        groups: state.groups,
        expenses: state.expenses,
        settlements: state.settlements,
      }),
    }
  )
);
