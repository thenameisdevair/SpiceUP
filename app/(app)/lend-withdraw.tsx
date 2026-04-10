import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useToast } from "@/hooks/useToast";
import { AmountInput } from "@/components/AmountInput";
import { withdrawFromLending, withdrawAllFromLending } from "@/lib/lending";
import { shortenAddress } from "@/lib/format";

type Stage = "input" | "reviewing" | "withdrawing" | "done";

export default function LendWithdraw() {
  const router = useRouter();
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const onboard = useAuthStore((s) => s.wallet);
  const lendingPositions = useEarnStore((s) => s.lendingPositions);
  const { recordTx } = useTransactionHistory();

  const position = lendingPositions.find((p) => p.poolId === poolId);

  const toast = useToast();
  const [amountStr, setAmountStr] = useState("");
  const [isMax, setIsMax] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");

  function setMaxAmount() {
    if (!position) return;
    setAmountStr(position.depositedAmount);
    setIsMax(true);
  }

  async function review() {
    if (!onboard || !amountStr || !position) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const txBuilder = isMax
        ? onboard.wallet.tx().lendWithdrawMax({
            token: position.token,
            ...(poolId ? { poolAddress: poolId as any } : {}),
          })
        : onboard.wallet.tx().lendWithdraw({
            token: position.token,
            amount: Amount.parse(amountStr, position.token),
            ...(poolId ? { poolAddress: poolId as any } : {}),
          });
      const result = await txBuilder.preflight();
      if (!result.ok) {
        toast.error(result.reason ?? "Transaction would fail");
        setStage("input");
      }
    } catch (e: any) {
      toast.error(e.message ?? String(e));
      setStage("input");
    }
  }

  async function confirm() {
    if (!onboard || !amountStr || !position) return;
    setStage("withdrawing");
    try {
      const tx = isMax
        ? await withdrawAllFromLending(onboard, position.token, poolId as any)
        : await withdrawFromLending(onboard, position.token, amountStr, poolId as any);
      setTxHash(tx.hash);
      await tx.wait();
      await recordTx({
        id: tx.hash,
        type: "lend_withdraw",
        amount: amountStr,
        token: position.token.symbol,
        counterparty: poolId,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: false,
      });
      setStage("done");
    } catch (e: any) {
      toast.error(e.message ?? "Transaction failed");
      setStage("input");
    }
  }

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-5xl mb-4">✓</Text>
        <Text className="text-white text-xl font-bold mb-2">Withdrawn!</Text>
        <Text className="text-neutral-400 text-sm mb-2">
          {amountStr} {position?.token.symbol ?? ""} returned to your wallet
        </Text>
        <Text className="text-neutral-600 text-xs mb-8" numberOfLines={1}>
          {shortenAddress(txHash)}
        </Text>
        <Pressable
          onPress={() => router.replace("/(app)/earn")}
          className="bg-accent p-4 rounded-xl w-full"
        >
          <Text className="text-white text-center font-semibold">Back to Earn</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Pressable onPress={() => router.back()} className="mb-6">
        <Text className="text-neutral-400 text-sm">\u2190 Back</Text>
      </Pressable>
      <Text className="text-white text-2xl font-bold mb-6">Withdraw from Lending</Text>

      {stage === "input" && (
        <View>
          {position && (
            <View className="bg-neutral-900 p-3 rounded-xl mb-4">
              <Text className="text-neutral-400 text-sm">
                Deposited:{" "}
                <Text className="text-white">
                  {position.depositedAmount} {position.token.symbol}
                </Text>
              </Text>
            </View>
          )}

          <Text className="text-neutral-400 text-sm mb-2">Amount</Text>
          {position && (
            <AmountInput
              value={amountStr}
              onChangeText={(v) => { setAmountStr(v); setIsMax(false); }}
              selectedToken={position.token}
              onSelectToken={() => {}}
            />
          )}

          <Pressable onPress={setMaxAmount} className="mt-2 py-2">
            <Text className="text-purple-400 text-sm">Withdraw All</Text>
          </Pressable>

          <Pressable
            onPress={review}
            disabled={!amountStr}
            className={`mt-6 p-4 rounded-xl ${amountStr ? "bg-accent" : "bg-neutral-800"}`}
          >
            <Text className="text-white text-center font-semibold">Review Withdrawal</Text>
          </Pressable>
        </View>
      )}

      {stage === "reviewing" && (
        <View>
          <View className="bg-neutral-900 p-4 rounded-xl mb-3">
            <Text className="text-purple-400 text-sm mb-1">Preflight passed</Text>
            <Text className="text-white">
              Withdraw {amountStr} {position?.token.symbol ?? ""}
            </Text>
          </View>
          <Pressable onPress={confirm} className="bg-purple-700 p-4 rounded-xl mb-2">
            <Text className="text-white text-center font-semibold">Confirm Withdrawal</Text>
          </Pressable>
          <Pressable onPress={() => setStage("input")} className="p-3">
            <Text className="text-neutral-400 text-center">\u2190 Back</Text>
          </Pressable>
        </View>
      )}

      {stage === "withdrawing" && (
        <View className="items-center py-4">
          <ActivityIndicator color="#7B5EA7" />
          <Text className="text-neutral-400 mt-2">Withdrawing...</Text>
        </View>
      )}
    </View>
  );
}
