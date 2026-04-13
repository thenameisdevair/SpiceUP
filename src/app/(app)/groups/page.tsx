"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGroups } from "@/hooks/useGroups";
import { useGroupsStore } from "@/stores/groups";
import { calcNetBalances } from "@/lib/groups";
import { GroupCard } from "@/components/GroupCard";
import { Skeleton } from "@/components/ui/Skeleton";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export default function GroupsPage() {
  const router = useRouter();
  const { groups, loading } = useGroups();
  const expenses = useGroupsStore((s) => s.expenses);
  const settlements = useGroupsStore((s) => s.settlements);

  // Compute net balances for each group
  const groupBalances = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcNetBalances>>();
    for (const group of groups) {
      const groupExpenses = expenses.filter((e) => e.groupId === group.id);
      const groupSettlements = settlements.filter((s) => s.groupId === group.id);
      map.set(group.id, calcNetBalances(groupExpenses, groupSettlements));
    }
    return map;
  }, [groups, expenses, settlements]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <Skeleton width="80px" height="24px" />
          <Skeleton width="90px" height="20px" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen relative">
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Groups</h1>
            <p className="text-spiceup-text-muted text-xs mt-0.5">
              {groups.length} group{groups.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/groups/new"
            className="flex items-center gap-1.5 bg-spiceup-accent hover:bg-spiceup-accent-hover text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors shadow-lg shadow-spiceup-accent/15"
          >
            <Plus size={15} />
            New Group
          </Link>
        </motion.div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-spiceup-accent/10 flex items-center justify-center mb-4">
              <Users size={28} className="text-spiceup-accent" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">No groups yet</h2>
            <p className="text-spiceup-text-muted text-sm mb-6 max-w-xs leading-relaxed">
              Create a group to start splitting expenses with friends
            </p>
            <Link
              href="/groups/new"
              className="inline-flex items-center gap-2 bg-spiceup-accent hover:bg-spiceup-accent-hover text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-lg shadow-spiceup-accent/20"
            >
              <Plus size={18} />
              Create Group
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            className="space-y-3"
          >
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <GroupCard
                  group={group}
                  netBalances={groupBalances.get(group.id) ?? []}
                  onClick={() => router.push(`/groups/${group.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Floating Action Button */}
      {groups.length > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
        >
          <Link
            href="/groups/new"
            className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-spiceup-accent hover:bg-spiceup-accent-hover
                       flex items-center justify-center shadow-xl shadow-spiceup-accent/30 transition-colors z-40 active:scale-95"
            aria-label="Add new group"
          >
            <Plus size={24} className="text-white" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
