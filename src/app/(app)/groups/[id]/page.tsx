"use client";

import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExpenseItem } from "@/components/ExpenseItem";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useApiClient } from "@/hooks/useApiClient";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { SELF_MEMBER_ID } from "@/lib/groups";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

interface SendResponse {
  txHash: string;
  deploymentTxHash: string | null;
}

interface SettlementModalProps {
  open: boolean;
  fromName: string;
  toName: string;
  amount: number;
  canExecuteOnchain: boolean;
  initialRecipientAddress: string;
  onClose: () => void;
  onConfirm: (args: { isPrivate: boolean; recipientAddress: string }) => void;
  confirming: boolean;
  confirmed: boolean;
  modalError: string;
  confirmedOnchain: boolean;
}

function isLikelyStarknetAddress(value: string) {
  return /^0x[0-9a-fA-F]+$/.test(value.trim()) && value.trim().length >= 10;
}

function SettlementModal({
  open,
  fromName,
  toName,
  amount,
  canExecuteOnchain,
  initialRecipientAddress,
  onClose,
  onConfirm,
  confirming,
  confirmed,
  modalError,
  confirmedOnchain,
}: SettlementModalProps) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress);

  if (!open) return null;

  const needsRecipientAddress = canExecuteOnchain && !isPrivate;
  const recipientError =
    needsRecipientAddress && recipientAddress.trim() && !isLikelyStarknetAddress(recipientAddress)
      ? "Enter a valid Starknet address starting with 0x"
      : "";
  const canConfirm =
    !confirming &&
    (!needsRecipientAddress ||
      (!!recipientAddress.trim() && !recipientError));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={confirmed ? onClose : undefined}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl border-t border-spiceup-border bg-spiceup-surface p-6"
          >
            {confirmed ? (
              <div className="flex flex-col items-center space-y-4 py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-spiceup-success/10"
                >
                  <CheckCircle2 size={32} className="text-spiceup-success" />
                </motion.div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">
                    {confirmedOnchain ? "Paid and recorded" : "Settlement recorded"}
                  </p>
                  <p className="text-sm text-spiceup-text-muted">
                    {confirmedOnchain
                      ? `$${amount.toFixed(2)} was sent on-chain and added to this group ledger.`
                      : `$${amount.toFixed(2)} was recorded in this group ledger.`}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={onClose}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="mb-1 text-lg font-semibold text-white">
                    Settle Balance
                  </h3>
                  <p className="text-sm text-spiceup-text-secondary">
                    {fromName} → {toName}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 py-6 text-center">
                  <p className="text-3xl font-bold text-white">${amount.toFixed(2)}</p>
                  <p className="mt-1 text-xs text-spiceup-text-muted">USDC</p>
                </div>

                <div className="flex rounded-xl border border-spiceup-border bg-spiceup-surface p-1">
                  {(["public", "private"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setIsPrivate(mode === "private")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all ${
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

                {needsRecipientAddress && (
                  <Input
                    label="Recipient Starknet Address"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(event) => setRecipientAddress(event.target.value)}
                    error={recipientError}
                  />
                )}

                <div className="rounded-xl border border-spiceup-border/60 bg-black/10 p-4">
                  <p className="text-xs leading-relaxed text-spiceup-text-muted">
                    {isPrivate
                      ? "Private execution is not live yet, so this mode records the settlement in the shared ledger only."
                      : canExecuteOnchain
                        ? "Public mode sends USDC on-chain from your wallet, then records the result in the group ledger."
                        : "Public mode records the settlement in the shared ledger only."}
                  </p>
                </div>

                {modalError && (
                  <p className="text-center text-sm text-red-400">{modalError}</p>
                )}

                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full gap-2"
                    loading={confirming}
                    disabled={!canConfirm}
                    onClick={() =>
                      onConfirm({
                        isPrivate,
                        recipientAddress: recipientAddress.trim(),
                      })
                    }
                  >
                    {isPrivate
                      ? "Record Private Settlement"
                      : canExecuteOnchain
                        ? "Pay and Record"
                        : "Record Settlement"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={onClose}
                    disabled={confirming}
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

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const api = useApiClient();
  const addToast = useToastStore((s) => s.addToast);
  const privyUserId = useAuthStore((s) => s.privyUserId);
  const groupId = params.id as string;

  const { group, expenses, netBalances, members, addSettlement, loading } =
    useGroupExpenses(groupId);

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) {
      map[member.id] = member.name;
    }
    return map;
  }, [members]);

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );

  const [settlementTarget, setSettlementTarget] = useState<{
    from: string;
    to: string;
    amount: number;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedOnchain, setConfirmedOnchain] = useState(false);
  const [modalError, setModalError] = useState("");

  const selfBalances = useMemo(
    () =>
      netBalances.filter(
        (balance) =>
          balance.from === SELF_MEMBER_ID || balance.to === SELF_MEMBER_ID
      ),
    [netBalances]
  );

  const otherBalances = useMemo(
    () =>
      netBalances.filter(
        (balance) =>
          balance.from !== SELF_MEMBER_ID && balance.to !== SELF_MEMBER_ID
      ),
    [netBalances]
  );

  const handleOpenSettle = useCallback((target: {
    from: string;
    to: string;
    amount: number;
  }) => {
    setSettlementTarget(target);
    setConfirming(false);
    setConfirmed(false);
    setConfirmedOnchain(false);
    setModalError("");
  }, []);

  const handleSettle = useCallback(
    async ({
      isPrivate,
      recipientAddress,
    }: {
      isPrivate: boolean;
      recipientAddress: string;
    }) => {
      if (!settlementTarget) return;

      const isSelfPaying = settlementTarget.from === SELF_MEMBER_ID;
      setConfirming(true);
      setModalError("");

      let txHash: string | null = null;

      try {
        if (!isPrivate && isSelfPaying) {
          const payeeMember =
            settlementTarget.to === SELF_MEMBER_ID
              ? null
              : memberById.get(settlementTarget.to);

          if (
            payeeMember &&
            recipientAddress &&
            payeeMember.walletAddress !== recipientAddress
          ) {
            await api(`/api/groups/${groupId}/members/${payeeMember.id}`, {
              method: "PATCH",
              body: {
                walletAddress: recipientAddress,
              },
            });
          }

          const sendResponse = await api<SendResponse>("/api/send", {
            method: "POST",
            body: {
              mode: "public",
              recipient: recipientAddress,
              token: "USDC",
              amount: settlementTarget.amount.toFixed(2),
            },
          });

          txHash = sendResponse.txHash;

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["balances", privyUserId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["transactions", privyUserId],
            }),
          ]);
        }

        try {
          await addSettlement({
            id: `settle-${Date.now()}`,
            groupId,
            fromMemberId: settlementTarget.from,
            toMemberId: settlementTarget.to,
            amount: settlementTarget.amount,
            token: "USDC",
            isPrivate,
            txHash,
            createdAt: Date.now(),
          });
        } catch (error) {
          if (txHash) {
            setModalError(
              "Payment was sent, but the group ledger could not be updated automatically. Please try recording this settlement again."
            );
            addToast({
              type: "warning",
              title: "Ledger update needed",
              message:
                error instanceof Error
                  ? error.message
                  : "The payment succeeded, but settlement recording still needs one more try.",
            });
            return;
          }

          throw error;
        }

        setConfirmedOnchain(!isPrivate && isSelfPaying);
        setConfirmed(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not complete this settlement.";
        setModalError(message);
        addToast({
          type: "error",
          title: "Settlement failed",
          message,
        });
      } finally {
        setConfirming(false);
      }
    },
    [
      addSettlement,
      addToast,
      api,
      groupId,
      memberById,
      privyUserId,
      queryClient,
      settlementTarget,
    ]
  );

  const handleCloseSettle = useCallback(() => {
    setSettlementTarget(null);
    setConfirming(false);
    setConfirmed(false);
    setConfirmedOnchain(false);
    setModalError("");
  }, []);

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-5 pb-8 pt-5">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/groups")}
            className="p-1 text-spiceup-text-muted transition-colors hover:text-white"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Loading Group...
          </h1>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-5 pb-8 pt-5">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/groups")}
            className="p-1 text-spiceup-text-muted transition-colors hover:text-white"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Group Not Found
          </h1>
        </div>
        <p className="py-12 text-center text-spiceup-text-muted">
          This group doesn&apos;t exist or hasn&apos;t been created yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 pb-8 pt-5">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/groups")}
          className="p-1 text-spiceup-text-muted transition-colors hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-white">
            {group.name}
          </h1>
          <p className="text-xs text-spiceup-text-muted">{members.length} members</p>
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

      {netBalances.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <span>Balances</span>
            <Badge variant="default">{netBalances.length}</Badge>
          </h2>

          <div className="space-y-2">
            {selfBalances.map((balance) => {
              const isOwing = balance.from === SELF_MEMBER_ID;
              const otherId = isOwing ? balance.to : balance.from;
              const otherName = memberNames[otherId] ?? otherId;

              return (
                <div
                  key={`${balance.from}-${balance.to}`}
                  className="flex items-center justify-between rounded-xl border border-spiceup-border bg-spiceup-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isOwing ? "bg-spiceup-error/10" : "bg-spiceup-success/10"
                      }`}
                    >
                      {isOwing ? (
                        <ArrowUpRight size={16} className="text-spiceup-error" />
                      ) : (
                        <ArrowDownLeft
                          size={16}
                          className="text-spiceup-success"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {isOwing ? "You owe" : `${otherName} owes you`}
                      </p>
                      <p className="text-xs text-spiceup-text-muted">
                        {isOwing
                          ? `Pay ${otherName} from your live wallet`
                          : `Share your receive route with ${otherName}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        isOwing ? "text-spiceup-error" : "text-spiceup-success"
                      }`}
                    >
                      ${balance.amount.toFixed(2)}
                    </span>
                    {isOwing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="!px-3 !py-1 text-xs"
                        onClick={() =>
                          handleOpenSettle({
                            from: balance.from,
                            to: balance.to,
                            amount: balance.amount,
                          })
                        }
                      >
                        Pay Now
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="!px-3 !py-1 text-xs"
                        onClick={() => {
                          addToast({
                            type: "info",
                            title: "Receive route ready",
                            message:
                              "Share your public receive page so they can pay you directly.",
                          });
                          router.push("/receive");
                        }}
                      >
                        <Copy size={12} />
                        Share Receive
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {otherBalances.map((balance) => {
              const fromName = memberNames[balance.from] ?? balance.from;
              const toName = memberNames[balance.to] ?? balance.to;

              return (
                <div
                  key={`${balance.from}-${balance.to}`}
                  className="flex items-center justify-between rounded-xl border border-spiceup-border/50 bg-spiceup-surface/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                      <ArrowUpRight size={14} className="text-spiceup-text-muted" />
                    </div>
                    <p className="text-sm text-spiceup-text-secondary">
                      {fromName} → {toName}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-spiceup-text-muted">
                    ${balance.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <span>Expenses</span>
          <Badge variant="default">{expenses.length}</Badge>
        </h2>

        {expenses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-spiceup-text-muted">No expenses yet</p>
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
              .sort((left, right) => right.createdAt - left.createdAt)
              .map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  selfId={SELF_MEMBER_ID}
                  memberNames={memberNames}
                />
              ))}
          </div>
        )}
      </section>

      {settlementTarget && (
        <SettlementModal
          open={true}
          fromName={
            settlementTarget.from === SELF_MEMBER_ID
              ? "You"
              : memberNames[settlementTarget.from] ?? settlementTarget.from
          }
          toName={
            settlementTarget.to === SELF_MEMBER_ID
              ? "You"
              : memberNames[settlementTarget.to] ?? settlementTarget.to
          }
          amount={settlementTarget.amount}
          canExecuteOnchain={settlementTarget.from === SELF_MEMBER_ID}
          initialRecipientAddress={
            settlementTarget.to === SELF_MEMBER_ID
              ? ""
              : (memberById.get(settlementTarget.to)?.walletAddress ?? "")
          }
          onClose={handleCloseSettle}
          onConfirm={handleSettle}
          confirming={confirming}
          confirmed={confirmed}
          modalError={modalError}
          confirmedOnchain={confirmedOnchain}
        />
      )}
    </div>
  );
}
