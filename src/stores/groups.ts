import { create } from "zustand";
import type { Group, Expense, Settlement } from "@/lib/groups";

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;

  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Also store expenses/settlements here so mutations persist across pages
interface ExpensesState {
  expenses: Expense[];
  settlements: Settlement[];

  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  addSettlement: (settlement: Settlement) => void;
}

export const useGroupsStore = create<GroupsState & ExpensesState>((set) => ({
  // Groups
  groups: [],
  loading: false,
  error: null,
  setGroups: (groups) => set({ groups, loading: false, error: null }),
  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  // Expenses & Settlements
  expenses: [],
  settlements: [],
  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) =>
    set((state) => ({ expenses: [expense, ...state.expenses] })),
  addSettlement: (settlement) =>
    set((state) => ({ settlements: [...state.settlements, settlement] })),
}));
