"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { ExpenseItem } from "@/components/ExpenseItem";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Settlement } from "@/lib/groups";

const SELF_ID = "self";

// ─── Settlement Modal ────────────────────────────────────

interface SettlementModalProps {
  open: boolean;
  fromName: string;
  toName: string;
  amount: number;
  onClose: () => void;
  onConfirm: (isPrivate: boolean) => void;
  confirming: boolean;
  confirmed: boolean;
}

function SettlementModal({
  open,
  fromName,
  toName,
  amount,
  onClose,
  onConfirm,
  confirming,
  confirmed,
}: SettlementModalProps) {
  const [isPrivate, setIsPrivate] = useState(false);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={confirmed ? onClose : undefined}
          />
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-spiceup-surface border-t border-spiceup-border rounded-t-3xl p-6 max-w-2xl mx-auto"
          >
            {confirmed ? (
              /* Success state */
              <div className="flex flex-col items-center py-6 space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-spiceup-success/10 flex items-center justify-center"
                >
                  <CheckCircle2 size={32} className="text-spiceup-success" />
                </motion.div>
                <div className="text-center">
                  <p className="text-white font-semibold text-lg">Settled!</p>
                  <p className="text-spiceup-text-muted text-sm">
                    ${amount.toFixed(2)} has been recorded
                  </p>
                </div>
                <Button variant="primary" size="md" className="w-full" onClick={onClose}>
                  Done
                </Button>
              </div>
            ) : (
              /* Confirm state */
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-white font-semibold text-lg mb-1">Settle Up</h3>
                  <p className="text-spiceup-text-secondary text-sm">
                    {fromName} → {toName}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-center bg-white/5 rounded-2xl py-6">
                  <p className="text-white text-3xl font-bold">${amount.toFixed(2)}</p>
                  <p className="text-spiceup-text-muted text-xs mt-1">USDC</p>
                </div>

                {/* Privacy toggle */}
                <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-1 flex">
                  {(["public", "private"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setIsPrivate(mode === "private")}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                        isPrivate === (mode === "private")
                          ? mode === "public"
                            ? "bg-white/10 text-white"
                            : "bg-spiceup-accent/20 text-spiceup-accent"
                          : "text-spiceup-text-muted hover:text-white"
                      }`}
                    >
                      {mode === "public" ? (
                        <Wallet size={14} />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      {mode === "public" ? "Public" : "Private"}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full gap-2"
                    loading={confirming}
                    onClick={() => onConfirm(isPrivate)}
                  >
                    Confirm & Settle
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Group Detail Page ───────────────────────────────────

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const {
    expenses,
    netBalances,
    members,
    addSettlement,
  } = useGroupExpenses(groupId);

  // Member name lookup
  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.id] = m.name;
    return map;
  }, [members]);

  // Settlement modal state
  const [settlementTarget, setSettlementTarget] = useState<{
    from: string;
    to: string;
    amount: number;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Self-involved balances (balances where self is involved)
  const selfBalances = useMemo(
    () =>
      netBalances.filter((nb) => nb.from === SELF_ID || nb.to === SELF_ID),
    [netBalances],
  );

  // Other balances (between other members)
  const otherBalances = useMemo(
    () => netBalances.filter((nb) => nb.from !== SELF_ID && nb.to !== SELF_ID),
    [netBalances],
  );

  const handleSettle = useCallback(
    async (isPrivate: boolean) => {
      if (!settlementTarget) return;
      setConfirming(true);

      // Simulate delay
      await new Promise((r) => setTimeout(r, 1500));

      const settlement: Settlement = {
        id: `settle-${Date.now()}`,
        groupId,
        fromMemberId: settlementTarget.from,
        toMemberId: settlementTarget.to,
        amount: settlementTarget.amount,
        token: "USDC",
        isPrivate,
        createdAt: Date.now(),
      };

      addSettlement(settlement);
      setConfirming(false);
      setConfirmed(true);
    },
    [settlementTarget, groupId, addSettlement],
  );

  const handleCloseSettle = useCallback(() => {
    setSettlementTarget(null);
    setConfirming(false);
    setConfirmed(false);
  }, []);

  // Check if this is a real group from mock data
  const groupExists = members.length > 0;

  if (!groupExists) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/groups")}
            className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white text-lg font-bold tracking-tight">Group Not Found</h1>
        </div>
        <p className="text-spiceup-text-muted text-center py-12">
          This group doesn&apos;t exist or hasn&apos;t been created yet.
        </p>
      </div>
    );
  }

  const groupName =
    expenses.length > 0
      ? null // will be derived from group data
      : "Group";

  // Derive group name from groupId (for mock groups)
  const displayName = groupId === "dinner-squad" ? "Dinner Squad" : groupId === "trip-fund" ? "Trip Fund" : "Group";

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/groups")}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-lg font-bold tracking-tight truncate">{displayName}</h1>
          <p className="text-spiceup-text-muted text-xs">
            {members.length} members
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push(`/groups/${groupId}/add-expense`)}
        >
          <Plus size={14} />
          Add Expense
        </Button>
      </div>

      {/* Net Balances Section */}
      {netBalances.length > 0 && (
        <section className="mb-6">
          <h2 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <span>Balances</span>
            <Badge variant="default">{netBalances.length}</Badge>
          </h2>
          <div className="space-y-2">
            {/* Self-involved balances */}
            {selfBalances.map((nb) => {
              const isOwing = nb.from === SELF_ID;
              const otherId = isOwing ? nb.to : nb.from;
              const otherName = memberNames[otherId] ?? otherId;
              return (
                <div
                  key={`${nb.from}-${nb.to}`}
                  className="bg-spiceup-surface border border-spiceup-border rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isOwing ? "bg-spiceup-error/10" : "bg-spiceup-success/10"
                      }`}
                    >
                      {isOwing ? (
                        <ArrowUpRight size={16} className="text-spiceup-error" />
                      ) : (
                        <ArrowDownLeft size={16} className="text-spiceup-success" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {isOwing ? "You owe" : `${otherName} owes you}`}
                      </p>
                      <p className="text-spiceup-text-muted text-xs">
                        {isOwing ? `→ ${otherName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold text-sm ${
                        isOwing ? "text-spiceup-error" : "text-spiceup-success"
                      }`}
                    >
                      ${nb.amount.toFixed(2)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="!py-1 !px-3 text-xs"
                      onClick={() =>
                        setSettlementTarget({
                          from: nb.from,
                          to: nb.to,
                          amount: nb.amount,
                        })
                      }
                    >
                      Settle
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Other balances */}
            {otherBalances.map((nb) => {
              const fromName = memberNames[nb.from] ?? nb.from;
              const toName = memberNames[nb.to] ?? nb.to;
              return (
                <div
                  key={`${nb.from}-${nb.to}`}
                  className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <ArrowUpRight size={14} className="text-spiceup-text-muted" />
                    </div>
                    <p className="text-spiceup-text-secondary text-sm">
                      {fromName} → {toName}
                    </p>
                  </div>
                  <span className="text-spiceup-text-muted text-sm font-medium">
                    ${nb.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Expenses Section */}
      <section>
        <h2 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
          <span>Expenses</span>
          <Badge variant="default">{expenses.length}</Badge>
        </h2>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-spiceup-text-muted text-sm mb-4">No expenses yet</p>
            <Button
              variant="secondary"
              size="md"
              className="gap-2"
              onClick={() => router.push(`/groups/${groupId}/add-expense`)}
            >
              <Plus size={16} />
              Add First Expense
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  selfId={SELF_ID}
                  memberNames={memberNames}
                />
              ))}
          </div>
        )}
      </section>

      {/* Settlement Modal */}
      {settlementTarget && (
        <SettlementModal
          open={true}
          fromName={
            settlementTarget.from === SELF_ID
              ? "You"
              : memberNames[settlementTarget.from] ?? settlementTarget.from
          }
          toName={
            settlementTarget.to === SELF_ID
              ? "You"
              : memberNames[settlementTarget.to] ?? settlementTarget.to
          }
          amount={settlementTarget.amount}
          onClose={handleCloseSettle}
          onConfirm={handleSettle}
          confirming={confirming}
          confirmed={confirmed}
        />
      )}
    </div>
  );
}
