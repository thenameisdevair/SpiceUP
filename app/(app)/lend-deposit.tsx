import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import type { Token } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useToast } from "@/hooks/useToast";
import { AmountInput } from "@/components/AmountInput";
import { TokenSelector } from "@/components/TokenSelector";
import { depositToLending } from "@/lib/lending";
import { ALL_TOKENS, USDC } from "@/constants/tokens";
import { ENV } from "@/lib/env";

type Stage = "input" | "reviewing" | "depositing" | "done";

export default function LendDeposit() {
  const router = useRouter();
  const { poolId } = useLocalSearchParams<{ poolId?: string }>();
  const onboard = useAuthStore((s) => s.wallet);
  const lendingMarkets = useEarnStore((s) => s.lendingMarkets);
  const lendingPositions = useEarnStore((s) => s.lendingPositions);
  const { recordTx } = useTransactionHistory();

  const toast = useToast();
  const [token, setToken] = useState<Token>(USDC);
  const [amountStr, setAmountStr] = useState("");
  const [stage, setStage] = useState<Stage>("input");

  const isSepolia = ENV.NETWORK !== "mainnet";

  const market = lendingMarkets.find(
    (m) => m.poolAddress === poolId || m.asset.symbol === token.symbol
  );
  const apyLabel = market?.stats?.supplyApy != null
    ? `${lendingPositions.find((p) => p.poolId === market.poolAddress)?.apyPercent?.toFixed(2) ?? "..."}%`
    : null;

  async function review() {
    if (!onboard || !amountStr) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const result = await onboard.wallet.tx().lendDeposit({
        token,
        amount: Amount.parse(amountStr, token),
        ...(poolId ? { poolAddress: poolId as any } : {}),
      }).preflight();
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
    if (!onboard || !amountStr) return;
    setStage("depositing");
    try {
      const tx = await depositToLending(onboard, token, amountStr, poolId as any);
      await tx.wait();
      await recordTx({
        id: tx.hash,
        type: "lend_deposit",
        amount: amountStr,
        token: token.symbol,
        counterparty: poolId ?? "vesu",
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
        <Text className="text-white text-xl font-bold mb-2">Deposited!</Text>
        <Text className="text-neutral-400 text-sm mb-1">
          {amountStr} {token.symbol} deposited
        </Text>
        {apyLabel && (
          <Text className="text-green-400 text-sm mb-6">Earning ~{apyLabel} APY</Text>
        )}
        <Pressable
          onPress={() => router.replace("/(app)/earn")}
          className="bg-accent p-4 rounded-xl w-full mt-4"
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
      <Text className="text-white text-2xl font-bold mb-6">Deposit to Earn</Text>

      {stage === "input" && (
        <View>
          <Text className="text-neutral-400 text-sm mb-2">Token</Text>
          <TokenSelector selected={token} onSelect={setToken} />

          {apyLabel && !isSepolia && (
            <View className="bg-green-900/30 border border-green-800/50 rounded-xl p-3 mt-3">
              <Text className="text-green-400 text-sm">Earning ~{apyLabel} APY</Text>
            </View>
          )}
          {isSepolia && (
            <View className="bg-neutral-800 rounded-xl p-3 mt-3">
              <Text className="text-neutral-400 text-sm">APY data unavailable on testnet</Text>
            </View>
          )}

          <Text className="text-neutral-400 text-sm mt-4 mb-2">Amount</Text>
          <AmountInput
            value={amountStr}
            onChangeText={setAmountStr}
            selectedToken={token}
            onSelectToken={setToken}
          />

          <Pressable
            onPress={review}
            disabled={!amountStr}
            className={`mt-8 p-4 rounded-xl ${amountStr ? "bg-accent" : "bg-neutral-800"}`}
          >
            <Text className="text-white text-center font-semibold">Review Deposit</Text>
          </Pressable>
        </View>
      )}

      {stage === "reviewing" && (
        <View>
          <View className="bg-neutral-900 p-4 rounded-xl mb-3">
            <Text className="text-purple-400 text-sm mb-1">Preflight passed</Text>
            <Text className="text-white">
              Deposit {amountStr} {token.symbol} to Vesu lending pool
            </Text>
            {apyLabel && (
              <Text className="text-green-400 text-sm mt-1">APY: {apyLabel}</Text>
            )}
            {isSepolia && (
              <Text className="text-neutral-500 text-sm mt-1">APY: \u2014</Text>
            )}
          </View>
          <Pressable onPress={confirm} className="bg-purple-700 p-4 rounded-xl mb-2">
            <Text className="text-white text-center font-semibold">Confirm Deposit</Text>
          </Pressable>
          <Pressable onPress={() => setStage("input")} className="p-3">
            <Text className="text-neutral-400 text-center">\u2190 Back</Text>
          </Pressable>
        </View>
      )}

      {stage === "depositing" && (
        <View className="items-center py-4">
          <ActivityIndicator color="#7B5EA7" />
          <Text className="text-neutral-400 mt-2">Depositing...</Text>
        </View>
      )}
    </View>
  );
}
