"use client";

import { motion } from "framer-motion";
import { Users, ChevronRight } from "lucide-react";
import type { Group, NetBalance } from "@/lib/groups";

interface GroupCardProps {
  group: Group;
  netBalances: NetBalance[];
  selfId?: string;
  onClick?: () => void;
}

/** Compute the net amount owed to self or owed by self */
function computeSelfBalance(
  netBalances: NetBalance[],
  selfId: string,
): number {
  let total = 0;
  for (const nb of netBalances) {
    if (nb.to === selfId) total += nb.amount; // someone owes self
    if (nb.from === selfId) total -= nb.amount; // self owes someone
  }
  return Math.round(total * 100) / 100;
}

const SELF_ID = "self";

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function GroupCard({ group, netBalances, onClick }: GroupCardProps) {
  const selfBalance = computeSelfBalance(netBalances, SELF_ID);
  const isPositive = selfBalance > 0.01;
  const isNegative = selfBalance < -0.01;
  const isSettled = !isPositive && !isNegative;

  // Show up to 4 member avatars
  const visibleMembers = group.members.slice(0, 4);
  const remainingCount = Math.max(0, group.members.length - 4);

  return (
    <motion.div
      whileHover={{ scale: 1.01, borderColor: "rgba(123,94,167,0.3)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-4.5 cursor-pointer
                 hover:border-spiceup-accent/30 active:border-spiceup-accent/50 transition-all duration-200 group"
    >
      {/* Top row: group name + balance badge */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-[15px] group-hover:text-spiceup-accent transition-colors">
          {group.name}
        </h3>
        <div className="flex items-center gap-2">
          {isSettled ? (
            <span className="text-spiceup-text-muted text-xs font-medium bg-white/5 px-2.5 py-1 rounded-full">
              Settled
            </span>
          ) : isPositive ? (
            <span className="text-spiceup-success text-xs font-semibold bg-spiceup-success/10 px-2.5 py-1 rounded-full">
              +${selfBalance.toFixed(2)}
            </span>
          ) : (
            <span className="text-spiceup-error text-xs font-semibold bg-spiceup-error/10 px-2.5 py-1 rounded-full">
              −${Math.abs(selfBalance).toFixed(2)}
            </span>
          )}
          <ChevronRight size={14} className="text-spiceup-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Members row */}
      <div className="flex items-center gap-3">
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {visibleMembers.map((member) => (
            <div
              key={member.id}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-spiceup-surface transition-transform hover:scale-110 hover:z-10"
              style={{ backgroundColor: member.avatarColor }}
              title={member.name}
            >
              {getInitials(member.name)}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-spiceup-text-secondary bg-white/10 border-2 border-spiceup-surface">
              +{remainingCount}
            </div>
          )}
        </div>
        {/* Member count */}
        <div className="flex items-center gap-1 text-spiceup-text-muted text-xs">
          <Users size={12} />
          <span>{group.members.length} members</span>
        </div>
      </div>
    </motion.div>
  );
}
