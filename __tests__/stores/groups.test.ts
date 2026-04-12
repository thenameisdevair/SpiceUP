// __tests__/stores/groups.test.ts
import { useGroupsStore } from "@/stores/groups";
import type { Group } from "@/lib/groups";

function makeGroup(id: string, name: string): Group {
  return {
    id,
    name,
    members: [],
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  useGroupsStore.setState({ groups: [], loading: false, error: null });
});

describe("useGroupsStore", () => {
  it("initializes with empty groups, loading false, error null", () => {
    const state = useGroupsStore.getState();
    expect(state.groups).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setGroups replaces the groups array", () => {
    const g1 = makeGroup("1", "Dinner");
    const g2 = makeGroup("2", "Travel");
    useGroupsStore.getState().setGroups([g1, g2]);
    expect(useGroupsStore.getState().groups).toEqual([g1, g2]);
  });

  it("addGroup prepends to existing groups (newest-first)", () => {
    const g1 = makeGroup("1", "Old Group");
    useGroupsStore.getState().setGroups([g1]);

    const g2 = makeGroup("2", "New Group");
    useGroupsStore.getState().addGroup(g2);

    const groups = useGroupsStore.getState().groups;
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("2"); // new group first
    expect(groups[1].id).toBe("1");
  });

  it("setLoading / setError work correctly", () => {
    useGroupsStore.getState().setLoading(true);
    expect(useGroupsStore.getState().loading).toBe(true);

    useGroupsStore.getState().setError("offline");
    expect(useGroupsStore.getState().error).toBe("offline");
  });
});
