import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useToast } from "@/hooks/useToast";
import { AmountInput } from "@/components/AmountInput";
import { stakeInPool } from "@/lib/staking";
import { STRK } from "@/constants/tokens";
import { shortenAddress } from "@/lib/format";

type Stage = "input" | "reviewing" | "staking" | "done";

export default function Stake() {
  const router = useRouter();
  const { poolAddress } = useLocalSearchParams<{ poolAddress: string }>();
  const onboard = useAuthStore((s) => s.wallet);
  const pools = useEarnStore((s) => s.pools);
  const { recordTx } = useTransactionHistory();

  const pool = pools.find((p) => p.poolContract === poolAddress);
  const toast = useToast();

  const [amountStr, setAmountStr] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");

  async function review() {
    if (!onboard || !amountStr || !poolAddress) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const amount = Amount.parse(amountStr, STRK);
      const result = await onboard.wallet.tx().stake(poolAddress as any, amount).preflight();
      if (!result.ok) {
        toast.error(result.reason ?? "Transaction would fail");
        setStage("input");
      }
    } catch (e: any) {
      toast.error(e.message ?? String(e));
      setStage("input");
    }
  }

  async function confirmStake() {
    if (!onboard || !amountStr || !poolAddress) return;
    setStage("staking");
    try {
      const tx = await stakeInPool(onboard, poolAddress as any, amountStr, STRK);
      setTxHash(tx.hash);
      await tx.wait();
      await recordTx({
        id: tx.hash,
        type: "stake",
        amount: amountStr,
        token: "STRK",
        counterparty: poolAddress,
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
        <Text className="text-white text-xl font-bold mb-2">Staked!</Text>
        <Text className="text-neutral-400 text-sm text-center mb-2">
          {amountStr} STRK staked with {pool?.validatorName ?? "validator"}
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
      <Text className="text-white text-2xl font-bold mb-1">Stake STRK</Text>
      {pool && (
        <Text className="text-neutral-500 text-sm mb-6">
          {pool.validatorName}  \u2014  Total: {pool.totalDelegated.toFormatted(true)} STRK  \u2014  APY: \u2014
        </Text>
      )}

      <Text className="text-neutral-400 text-sm mb-2">Amount (STRK)</Text>
      <AmountInput
        value={amountStr}
        onChangeText={setAmountStr}
        selectedToken={STRK}
        onSelectToken={() => {}}
      />

      <View className="mt-8">
        {stage === "input" && (
          <Pressable
            onPress={review}
            disabled={!amountStr}
            className={`p-4 rounded-xl ${amountStr ? "bg-accent" : "bg-neutral-800"}`}
          >
            <Text className="text-white text-center font-semibold">Review Stake</Text>
          </Pressable>
        )}

        {stage === "reviewing" && (
          <View>
            <View className="bg-neutral-900 p-4 rounded-xl mb-3">
              <Text className="text-purple-400 text-sm mb-1">Preflight passed</Text>
              <Text className="text-white">
                Stake {amountStr} STRK with {pool?.validatorName ?? "validator"}
              </Text>
            </View>
            <Pressable onPress={confirmStake} className="bg-purple-700 p-4 rounded-xl mb-2">
              <Text className="text-white text-center font-semibold">Confirm &amp; Stake</Text>
            </Pressable>
            <Pressable onPress={() => setStage("input")} className="p-3">
              <Text className="text-neutral-400 text-center">\u2190 Back</Text>
            </Pressable>
          </View>
        )}

        {stage === "staking" && (
          <View className="items-center py-4">
            <ActivityIndicator color="#7B5EA7" />
            <Text className="text-neutral-400 mt-2">Staking STRK...</Text>
          </View>
        )}
      </View>
    </View>
  );
}
