import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import type { Token, Address } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useToast } from "@/hooks/useToast";
import { AmountInput } from "@/components/AmountInput";
import { ETH } from "@/constants/tokens";
import { withdrawConfidential, ragequit } from "@/lib/tongo";

type Stage = "input" | "reviewing" | "withdrawing" | "done";

export default function Withdraw() {
  const router = useRouter();
  const onboard = useAuthStore((s) => s.wallet);
  const tongo = useAuthStore((s) => s.tongo);
  const confidential = useWalletStore((s) => s.confidential);
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");
  const toast = useToast();
  const [doneLabel, setDoneLabel] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!onboard || !tongo || !amountStr) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const amount = Amount.parse(amountStr, token);
      const to = onboard.wallet.address as Address;
      const result = await onboard.wallet
        .tx()
        .confidentialWithdraw(tongo, { amount, to, sender: onboard.wallet.address })
        .preflight();
      if (!result.ok) {
        toast.error(result.reason ?? "Transaction would fail");
        setStage("input");
      }
    } catch (e: any) {
      toast.error(e.message ?? String(e));
      setStage("input");
    }
  }

  async function withdraw() {
    if (!onboard || !tongo || !amountStr) return;
    setStage("withdrawing");
    try {
      const to = onboard.wallet.address as Address;
      const tx = await withdrawConfidential(onboard, tongo, amountStr, token, to);
      setTxHash(tx.hash);
      await tx.wait();

      await recordTx({
        id: tx.hash,
        type: "withdraw",
        amount: amountStr,
        token: token.symbol,
        counterparty: "self",
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: true,
      });

      setDoneLabel(`${amountStr} ${token.symbol} withdrawn to your public wallet`);
      setStage("done");
    } catch (e: any) {
      toast.error(e.message ?? "Transaction failed");
      setStage("input");
    }
  }

  async function handleRagequit() {
    if (!onboard || !tongo) return;
    Alert.alert(
      "Emergency Withdrawal",
      "This will withdraw your entire confidential balance to your public wallet. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw All",
          style: "destructive",
          onPress: async () => {
            setStage("withdrawing");
            try {
              const to = onboard.wallet.address as Address;
              const tx = await ragequit(onboard, tongo, to);
              setTxHash(tx.hash);
              await tx.wait();

              await recordTx({
                id: tx.hash,
                type: "withdraw",
                amount: "ALL",
                token: "CONF",
                counterparty: "self",
                timestamp: Date.now(),
                txHash: tx.hash,
                isPrivate: true,
              });

              setDoneLabel("All confidential funds withdrawn to your public wallet");
              setStage("done");
            } catch (e: any) {
              toast.error(e.message ?? "Emergency withdrawal failed");
              setStage("input");
            }
          },
        },
      ]
    );
  }

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-2xl font-bold mb-4">Withdrawn!</Text>
        <Text className="text-neutral-400 text-sm mb-2 text-center">{doneLabel}</Text>
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
      <Text className="text-white text-2xl font-bold mb-2">Withdraw to Public</Text>
      <Text className="text-neutral-500 text-sm mb-4">
        Move funds from your private balance back to your public wallet.
      </Text>

      {/* Current confidential balance */}
      {confidential && (
        <View className="bg-neutral-900 p-3 rounded-xl mb-6 border border-purple-900/40">
          <Text className="text-neutral-400 text-xs mb-1">Private Balance</Text>
          <Text className="text-white font-medium">{String(confidential.balance)}</Text>
        </View>
      )}

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
              <Text className="text-green-400 text-sm mb-1">Preflight passed</Text>
              <Text className="text-white">
                Withdraw {amountStr} {token.symbol} → Public Wallet
              </Text>
            </View>
            <Pressable onPress={withdraw} className="bg-green-700 p-4 rounded-xl mb-2">
              <Text className="text-white text-center font-semibold">Confirm & Withdraw</Text>
            </Pressable>
            <Pressable onPress={() => setStage("input")} className="p-3">
              <Text className="text-neutral-400 text-center">Cancel</Text>
            </Pressable>
          </View>
        )}

        {stage === "withdrawing" && (
          <View className="items-center py-4">
            <ActivityIndicator color="#7B5EA7" />
            <Text className="text-neutral-400 mt-2">Withdrawing funds...</Text>
          </View>
        )}
      </View>

      {/* Emergency ragequit — only shown in input stage */}
      {stage === "input" && (
        <Pressable
          onPress={handleRagequit}
          className="mt-auto mb-6 bg-red-900/40 border border-red-900 p-4 rounded-xl"
        >
          <Text className="text-red-400 text-center font-medium">Emergency Withdraw All</Text>
          <Text className="text-red-600 text-xs text-center mt-1">
            Drains entire private balance to your public wallet
          </Text>
        </Pressable>
      )}
    </View>
  );
}
