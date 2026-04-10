import { create } from "zustand";
import type { Group } from "@/lib/groups";

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;

  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  loading: false,
  error: null,
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
