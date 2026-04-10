import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { getGroups } from "@/lib/groups";
import { cacheGroups, getCachedGroups } from "@/lib/groupsCache";

export function useGroups() {
  const { privyUserId } = useAuthStore();
  const { setGroups, setLoading, setError } = useGroupsStore();

  const fetch = useCallback(async () => {
    if (!privyUserId) return;

    // Serve cache immediately for instant render
    const cached = getCachedGroups();
    if (cached.length > 0) setGroups(cached);

    setLoading(true);
    try {
      const fresh = await getGroups(privyUserId);
      setGroups(fresh);
      cacheGroups(fresh);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [privyUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  const groups = useGroupsStore((s) => s.groups);
  return { groups, refresh: fetch };
}
