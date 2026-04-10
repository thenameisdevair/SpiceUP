import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { AmountInput } from "@/components/AmountInput";
import { beginUnstake, finalizeUnstake } from "@/lib/staking";
import { STRK } from "@/constants/tokens";
import { formatBalance, shortenAddress } from "@/lib/format";

type Stage = "input" | "reviewing" | "unstaking" | "done_intent" | "finalizing" | "done";

export default function Unstake() {
  const router = useRouter();
  const { poolAddress } = useLocalSearchParams<{ poolAddress: string }>();
  const onboard = useAuthStore((s) => s.wallet);
  const stakedPositions = useEarnStore((s) => s.stakedPositions);
  const { recordTx } = useTransactionHistory();

  const position = stakedPositions.find((p) => p.poolContract === poolAddress);
  const canFinalize = useMemo(
    () =>
      position !== undefined &&
      !position.unpooling.isZero() &&
      position.unpoolTime !== null &&
      new Date() >= position.unpoolTime,
    [position]
  );

  const [amountStr, setAmountStr] = useState("");
  const [stage, setStage] = useState<Stage>(canFinalize ? "reviewing" : "input");
  const [txHash, setTxHash] = useState("");

  async function reviewIntent() {
    if (!onboard || !amountStr || !poolAddress) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const amount = Amount.parse(amountStr, STRK);
      const result = await onboard.wallet.tx().exitPoolIntent(poolAddress as any, amount).preflight();
      if (!result.ok) {
        Alert.alert("Transaction would fail", result.reason ?? "Unknown error");
        setStage("input");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
      setStage("input");
    }
  }

  async function confirmIntent() {
    if (!onboard || !amountStr || !poolAddress) return;
    setStage("unstaking");
    try {
      const tx = await beginUnstake(onboard, poolAddress as any, amountStr, STRK);
      setTxHash(tx.hash);
      await tx.wait();
      await recordTx({
        id: tx.hash,
        type: "unstake_intent",
        amount: amountStr,
        token: "STRK",
        counterparty: poolAddress,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: false,
      });
      setStage("done_intent");
    } catch (e: any) {
      Alert.alert("Transaction failed", e.message ?? String(e));
      setStage("input");
    }
  }

  async function confirmFinalize() {
    if (!onboard || !poolAddress) return;
    setStage("finalizing");
    try {
      const tx = await finalizeUnstake(onboard, poolAddress as any);
      setTxHash(tx.hash);
      await tx.wait();
      const unstakeAmount = position ? formatBalance(position.unpooling) : "0";
      await recordTx({
        id: tx.hash,
        type: "unstake",
        amount: unstakeAmount,
        token: "STRK",
        counterparty: poolAddress,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: false,
      });
      setStage("done");
    } catch (e: any) {
      Alert.alert("Transaction failed", e.message ?? String(e));
      setStage("reviewing");
    }
  }

  // Done screens
  if (stage === "done_intent") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-yellow-400 text-5xl mb-4">⟳</Text>
        <Text className="text-white text-xl font-bold mb-2">Exit Intent Submitted</Text>
        <Text className="text-neutral-400 text-sm text-center mb-8">
          Estimated wait: ~21 days. Return to complete your unstake.
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

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-5xl mb-4">✓</Text>
        <Text className="text-white text-xl font-bold mb-2">Unstake Complete</Text>
        <Text className="text-neutral-400 text-sm mb-2">
          {position ? formatBalance(position.unpooling) : ""} STRK returned to your wallet
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
      <Text className="text-white text-2xl font-bold mb-6">Unstake STRK</Text>

      {/* Sub-flow B: Finalize */}
      {canFinalize && (
        <>
          {stage === "reviewing" && (
            <View>
              <View className="bg-neutral-900 p-4 rounded-xl mb-6">
                <Text className="text-neutral-400 text-sm mb-1">Ready to complete</Text>
                <Text className="text-white text-lg font-semibold">
                  Your unstake of {position ? formatBalance(position.unpooling) : ""} STRK is ready.
                </Text>
              </View>
              <Pressable onPress={confirmFinalize} className="bg-purple-700 p-4 rounded-xl">
                <Text className="text-white text-center font-semibold">Complete Unstake</Text>
              </Pressable>
            </View>
          )}
          {stage === "finalizing" && (
            <View className="items-center py-4">
              <ActivityIndicator color="#7B5EA7" />
              <Text className="text-neutral-400 mt-2">Finalizing...</Text>
            </View>
          )}
        </>
      )}

      {/* Sub-flow A: Exit intent */}
      {!canFinalize && (
        <>
          {stage === "input" && (
            <View>
              {position && (
                <View className="bg-neutral-900 p-3 rounded-xl mb-4">
                  <Text className="text-neutral-400 text-sm">
                    Currently staked:{" "}
                    <Text className="text-white">{formatBalance(position.staked)} STRK</Text>
                  </Text>
                </View>
              )}
              <View className="bg-yellow-900/30 border border-yellow-800/50 rounded-xl p-3 mb-4">
                <Text className="text-yellow-400 text-xs">
                  You will need to wait for the unbonding period before claiming.
                </Text>
              </View>
              <Text className="text-neutral-400 text-sm mb-2">Amount (STRK)</Text>
              <AmountInput
                value={amountStr}
                onChangeText={setAmountStr}
                selectedToken={STRK}
                onSelectToken={() => {}}
              />
              <Pressable
                onPress={reviewIntent}
                disabled={!amountStr}
                className={`mt-6 p-4 rounded-xl ${amountStr ? "bg-accent" : "bg-neutral-800"}`}
              >
                <Text className="text-white text-center font-semibold">Review Unstake</Text>
              </Pressable>
            </View>
          )}

          {stage === "reviewing" && (
            <View>
              <View className="bg-neutral-900 p-4 rounded-xl mb-3">
                <Text className="text-purple-400 text-sm mb-1">Preflight passed</Text>
                <Text className="text-white">
                  Unstake {amountStr} STRK from {position?.validatorName ?? "validator"}
                </Text>
              </View>
              <Pressable onPress={confirmIntent} className="bg-purple-700 p-4 rounded-xl mb-2">
                <Text className="text-white text-center font-semibold">Confirm Unstake Intent</Text>
              </Pressable>
              <Pressable onPress={() => setStage("input")} className="p-3">
                <Text className="text-neutral-400 text-center">\u2190 Back</Text>
              </Pressable>
            </View>
          )}

          {stage === "unstaking" && (
            <View className="items-center py-4">
              <ActivityIndicator color="#7B5EA7" />
              <Text className="text-neutral-400 mt-2">Submitting exit intent...</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
