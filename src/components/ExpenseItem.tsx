"use client";

import { formatTimestamp } from "@/lib/format";
import type { Expense } from "@/lib/groups";

interface ExpenseItemProps {
  expense: Expense;
  selfId?: string;
  memberNames: Record<string, string>;
}

export function ExpenseItem({ expense, selfId = "self", memberNames }: ExpenseItemProps) {
  const payerName = memberNames[expense.paidBy] ?? expense.paidBy;
  const isSelfPaid = expense.paidBy === selfId;

  // Find self's split
  const selfSplit = expense.splits.find((s) => s.memberId === selfId);
  const selfShare = selfSplit?.amount ?? 0;

  // What self owes or is owed for this expense
  // If self paid: self gets (amount - selfShare) back
  // If self didn't pay: self owes selfShare
  let balanceLabel: string;
  let balanceColor: string;
  if (isSelfPaid) {
    const owedBack = expense.amount - selfShare;
    if (owedBack > 0.01) {
      balanceLabel = `You're owed $${owedBack.toFixed(2)}`;
      balanceColor = "text-spiceup-success";
    } else {
      balanceLabel = "Settled";
      balanceColor = "text-spiceup-text-muted";
    }
  } else {
    balanceLabel = `You owe $${selfShare.toFixed(2)}`;
    balanceColor = "text-spiceup-error";
  }

  return (
    <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-4">
      {/* Top: description + amount */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">
            {expense.description}
          </p>
          <p className="text-spiceup-text-muted text-xs mt-0.5">
            Paid by <span className="text-spiceup-text-secondary">{payerName}</span>
            {" · "}
            {formatTimestamp(expense.createdAt)}
          </p>
        </div>
        <span className="text-white font-semibold text-sm ml-3 whitespace-nowrap">
          ${expense.amount.toFixed(2)}
        </span>
      </div>

      {/* Bottom: your share */}
      <div className="flex items-center justify-between pt-2 border-t border-spiceup-border/50">
        <span className="text-spiceup-text-muted text-xs">Your share: ${selfShare.toFixed(2)}</span>
        <span className={`text-xs font-medium ${balanceColor}`}>
          {balanceLabel}
        </span>
      </div>
    </div>
  );
}
