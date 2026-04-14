"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  FileText,
  Users,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import type { Expense, ExpenseSplit } from "@/lib/groups";

type AddExpenseStage = "input" | "reviewing" | "done";
type SplitMode = "equal" | "custom";

export default function AddExpensePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const { members, addExpense, loading } = useGroupExpenses(groupId);

  const [stage, setStage] = useState<AddExpenseStage>("input");
  const [paidById, setPaidById] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDC");
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Derived
  const amountNum = parseFloat(amount) || 0;
  const perPerson = members.length > 0 ? Math.round((amountNum / members.length) * 100) / 100 : 0;

  // Build splits
  const splits: ExpenseSplit[] = useMemo(() => {
    if (amountNum <= 0 || members.length === 0) return [];
    if (splitMode === "equal") {
      // Distribute remainder to first member
      const base = Math.floor((amountNum * 100) / members.length) / 100;
      const remainder = Math.round((amountNum - base * members.length) * 100) / 100;
      return members.map((m, i) => ({
        memberId: m.id,
        amount: i === 0 ? Math.round((base + remainder) * 100) / 100 : base,
      }));
    }
    // Custom splits
    return members.map((m) => ({
      memberId: m.id,
      amount: parseFloat(customSplits[m.id] || "0"),
    }));
  }, [amountNum, members, splitMode, customSplits]);

  const splitTotal = useMemo(
    () => Math.round(splits.reduce((sum, s) => sum + s.amount, 0) * 100) / 100,
    [splits],
  );

  const splitsValid = splitMode === "equal"
    ? true
    : Math.abs(splitTotal - amountNum) < 0.01;

  const canReview = paidById && amountNum > 0 && description.trim() && splitsValid;

  const handleReview = useCallback(() => {
    if (!canReview) return;
    setStage("reviewing");
  }, [canReview]);

  const handleConfirm = useCallback(async () => {
    if (!paidById) return;

    setSubmitting(true);
    setError("");

    try {
      const expense: Expense = {
        id: `exp-${Date.now()}`,
        groupId,
        description: description.trim(),
        amount: amountNum,
        token,
        paidBy: paidById,
        splitMode,
        splits,
        createdAt: Date.now(),
      };
      await addExpense(expense);
      setStage("done");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't save this expense yet."
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    addExpense,
    amountNum,
    description,
    groupId,
    paidById,
    splitMode,
    splits,
    token,
  ]);

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.id] = m.name;
    return map;
  }, [members]);

  const paidByName = paidById ? memberNames[paidById] ?? paidById : "";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white text-lg font-bold">Loading Group...</h1>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white text-lg font-bold">Group Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (stage === "reviewing") setStage("input");
            else if (stage === "done") router.back();
            else router.back();
          }}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">
          {stage === "done" ? "Expense Added!" : "Add Expense"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== INPUT STAGE ===== */}
        {stage === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Who paid? */}
            <div>
              <label className="text-sm text-spiceup-text-secondary font-medium mb-2 block">
                Who paid?
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaidById(m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      paidById === m.id
                        ? "bg-spiceup-accent text-white border border-spiceup-accent"
                        : "bg-white/5 border border-spiceup-border text-spiceup-text-secondary hover:border-spiceup-accent/30"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount + Token */}
            <div>
              <label className="text-sm text-spiceup-text-secondary font-medium mb-2 block">
                Amount
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <DollarSign
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-spiceup-text-muted"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                    }}
                    className="w-full bg-spiceup-surface text-white rounded-xl border border-spiceup-border
                               placeholder:text-spiceup-text-muted
                               focus:outline-none focus:border-spiceup-accent focus:ring-1 focus:ring-spiceup-accent/30
                               transition-all py-3 pl-10 pr-4 text-lg font-semibold"
                  />
                </div>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-spiceup-surface text-white rounded-xl border border-spiceup-border
                             focus:outline-none focus:border-spiceup-accent px-4 text-sm font-medium
                             appearance-none cursor-pointer min-w-[90px]"
                >
                  <option value="USDC">USDC</option>
                  <option value="ETH">ETH</option>
                  <option value="STRK">STRK</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <Input
              label="Description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              icon={<FileText size={16} />}
            />

            {/* Split Mode */}
            <div>
              <label className="text-sm text-spiceup-text-secondary font-medium mb-2 block">
                Split
              </label>
              <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-1 flex">
                {(["equal", "custom"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSplitMode(mode)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      splitMode === mode
                        ? "bg-white/10 text-white"
                        : "text-spiceup-text-muted hover:text-white"
                    }`}
                  >
                    <Users size={14} />
                    {mode === "equal" ? "Equal" : "Custom"}
                  </button>
                ))}
              </div>

              {/* Equal split preview */}
              {splitMode === "equal" && amountNum > 0 && (
                <div className="mt-3 bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-spiceup-text-muted text-xs">
                    Each person pays
                  </p>
                  <p className="text-white font-semibold text-lg">
                    ${perPerson.toFixed(2)}
                  </p>
                  <p className="text-spiceup-text-muted text-xs mt-0.5">
                    {members.length} {members.length === 1 ? "person" : "people"}
                  </p>
                </div>
              )}

              {/* Custom split inputs */}
              {splitMode === "custom" && (
                <div className="mt-3 space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: m.avatarColor }}
                      >
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-white text-sm flex-1">{m.name}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={customSplits[m.id] || ""}
                        onChange={(e) =>
                          setCustomSplits((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        className="w-24 bg-spiceup-bg text-white rounded-lg border border-spiceup-border
                                   placeholder:text-spiceup-text-muted
                                   focus:outline-none focus:border-spiceup-accent
                                   py-2 px-3 text-sm text-right"
                      />
                    </div>
                  ))}
                  {/* Total check */}
                  <div className="flex items-center justify-between pt-2 border-t border-spiceup-border/50">
                    <span className="text-spiceup-text-muted text-xs">Split total</span>
                    <span
                      className={`text-xs font-medium ${
                        Math.abs(splitTotal - amountNum) < 0.01
                          ? "text-spiceup-success"
                          : "text-spiceup-error"
                      }`}
                    >
                      ${splitTotal.toFixed(2)} / ${amountNum.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {/* Review button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canReview}
              onClick={handleReview}
            >
              Review Expense
            </Button>
          </motion.div>
        )}

        {/* ===== REVIEWING STAGE ===== */}
        {stage === "reviewing" && (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-4">
              {/* Amount */}
              <div className="text-center">
                <p className="text-spiceup-text-secondary text-sm mb-1">
                  Expense amount
                </p>
                <p className="text-white text-3xl font-bold">
                  ${amountNum.toFixed(2)}{" "}
                  <span className="text-lg text-spiceup-text-muted">{token}</span>
                </p>
              </div>

              <div className="h-px bg-spiceup-border" />

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Description</span>
                  <span className="text-white text-sm">{description.trim()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Paid by</span>
                  <span className="text-white text-sm">{paidByName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Split</span>
                  <span className="text-white text-sm">
                    {splitMode === "equal" ? "Equal" : "Custom"} ({members.length}{" "}
                    {members.length === 1 ? "person" : "people"})
                  </span>
                </div>
              </div>

              <div className="h-px bg-spiceup-border" />

              {/* Split breakdown */}
              <div>
                <p className="text-spiceup-text-muted text-xs mb-2">Split breakdown</p>
                <div className="space-y-2">
                  {splits.map((s) => (
                    <div
                      key={s.memberId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-spiceup-text-secondary text-sm">
                        {memberNames[s.memberId] ?? s.memberId}
                      </span>
                      <span className="text-white text-sm font-medium">
                        ${s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={submitting}
                onClick={handleConfirm}
              >
                Confirm & Add
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => setStage("input")}
              >
                Go Back
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== DONE STAGE ===== */}
        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-12 space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="w-20 h-20 rounded-full bg-spiceup-success/10 flex items-center justify-center"
            >
              <CheckCircle2 size={40} className="text-spiceup-success" />
            </motion.div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-1">Expense Added!</p>
              <p className="text-spiceup-text-secondary text-sm">
                {description.trim()} — ${amountNum.toFixed(2)} {token}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => router.push(`/groups/${groupId}`)}
              >
                Back to Group
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => {
                  setStage("input");
                  setAmount("");
                  setDescription("");
                  setPaidById(null);
                  setCustomSplits({});
                }}
              >
                Add Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
