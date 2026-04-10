import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import type { Token } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { AmountInput } from "@/components/AmountInput";
import { ETH } from "@/constants/tokens";
import { fundConfidential } from "@/lib/tongo";

type Stage = "input" | "reviewing" | "funding" | "done";

export default function Fund() {
  const router = useRouter();
  const onboard = useAuthStore((s) => s.wallet);
  const tongo = useAuthStore((s) => s.tongo);
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!onboard || !tongo || !amountStr) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const amount = Amount.parse(amountStr, token);
      const result = await onboard.wallet
        .tx()
        .confidentialFund(tongo, { amount, sender: onboard.wallet.address })
        .preflight();
      if (!result.ok) {
        Alert.alert("Transaction would fail", result.reason ?? "Unknown error");
        setStage("input");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
      setStage("input");
    }
  }

  async function fund() {
    if (!onboard || !tongo || !amountStr) return;
    setStage("funding");
    try {
      const tx = await fundConfidential(onboard, tongo, amountStr, token);
      setTxHash(tx.hash);
      await tx.wait();

      await recordTx({
        id: tx.hash,
        type: "fund",
        amount: amountStr,
        token: token.symbol,
        counterparty: "self",
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: true,
      });

      setStage("done");
    } catch (e: any) {
      Alert.alert("Transaction failed", e.message ?? String(e));
      setStage("input");
    }
  }

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-purple-400 text-2xl font-bold mb-4">Funded!</Text>
        <Text className="text-neutral-400 text-sm mb-2">
          {amountStr} {token.symbol} moved to your private balance
        </Text>
        <Text className="text-neutral-600 text-xs mb-8" numberOfLines={1}>
          {txHash}
        </Text>
        <Pressable
          onPress={() => router.replace("/(app)/home")}
          className="bg-accent p-4 rounded-xl w-full"
        >
          <Text className="text-white text-center font-semibold">Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      {/* Header */}
      <Pressable onPress={() => router.back()} className="mb-6">
        <Text className="text-neutral-400 text-sm">← Back</Text>
      </Pressable>
      <Text className="text-white text-2xl font-bold mb-2">Fund Private Balance</Text>
      <Text className="text-neutral-500 text-sm mb-8">
        Move tokens from your public wallet into your private balance. Amounts will be hidden on-chain.
      </Text>

      <Text className="text-neutral-400 text-sm mb-2">Amount</Text>
      <AmountInput
        value={amountStr}
        onChangeText={setAmountStr}
        selectedToken={token}
        onSelectToken={setToken}
      />

      <View className="mt-8">
        {stage === "input" && (
          <Pressable
            onPress={review}
            className="bg-accent p-4 rounded-xl"
            disabled={!amountStr}
          >
            <Text className="text-white text-center font-semibold">Review</Text>
          </Pressable>
        )}

        {stage === "reviewing" && (
          <View>
            <View className="bg-neutral-900 p-4 rounded-xl mb-3">
              <Text className="text-purple-400 text-sm mb-1">Preflight passed</Text>
              <Text className="text-white">
                Fund {amountStr} {token.symbol} → Private Balance
              </Text>
            </View>
            <Pressable onPress={fund} className="bg-purple-700 p-4 rounded-xl mb-2">
              <Text className="text-white text-center font-semibold">Confirm & Fund</Text>
            </Pressable>
            <Pressable onPress={() => setStage("input")} className="p-3">
              <Text className="text-neutral-400 text-center">Cancel</Text>
            </Pressable>
          </View>
        )}

        {stage === "funding" && (
          <View className="items-center py-4">
            <ActivityIndicator color="#7B5EA7" />
            <Text className="text-neutral-400 mt-2">Funding private balance...</Text>
          </View>
        )}
      </View>
    </View>
  );
}
