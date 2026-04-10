import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { claimPoolRewards } from "@/lib/staking";
import { formatBalance, shortenAddress } from "@/lib/format";

type Stage = "reviewing" | "claiming" | "done";

export default function Claim() {
  const router = useRouter();
  const { poolAddress } = useLocalSearchParams<{ poolAddress: string }>();
  const onboard = useAuthStore((s) => s.wallet);
  const stakedPositions = useEarnStore((s) => s.stakedPositions);
  const { recordTx } = useTransactionHistory();

  const position = stakedPositions.find((p) => p.poolContract === poolAddress);

  const [stage, setStage] = useState<Stage>("reviewing");
  const [txHash, setTxHash] = useState("");
  const [rewardsLabel, setRewardsLabel] = useState("");

  useEffect(() => {
    if (!position || position.rewards.isZero()) {
      router.back();
      return;
    }
    setRewardsLabel(formatBalance(position.rewards));
  }, [position]);

  async function claim() {
    if (!onboard || !poolAddress) return;
    setStage("claiming");
    try {
      const tx = await claimPoolRewards(onboard, poolAddress as any);
      setTxHash(tx.hash);
      await tx.wait();
      await recordTx({
        id: tx.hash,
        type: "claim_rewards",
        amount: rewardsLabel,
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

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-5xl mb-4">✓</Text>
        <Text className="text-white text-xl font-bold mb-2">Rewards Claimed!</Text>
        <Text className="text-neutral-400 text-sm mb-2">{rewardsLabel} STRK claimed</Text>
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
      <Text className="text-white text-2xl font-bold mb-6">Claim Rewards</Text>

      {stage === "reviewing" && (
        <View>
          <View className="bg-neutral-900 p-4 rounded-xl mb-6">
            <Text className="text-neutral-400 text-sm mb-1">Claimable rewards</Text>
            <Text className="text-green-400 text-2xl font-bold">{rewardsLabel} STRK</Text>
            <Text className="text-neutral-500 text-xs mt-1">
              From {position?.validatorName ?? "validator"}
            </Text>
          </View>
          <Pressable onPress={claim} className="bg-green-800 p-4 rounded-xl">
            <Text className="text-white text-center font-semibold">Claim Rewards</Text>
          </Pressable>
        </View>
      )}

      {stage === "claiming" && (
        <View className="items-center py-4">
          <ActivityIndicator color="#7B5EA7" />
          <Text className="text-neutral-400 mt-2">Claiming rewards...</Text>
        </View>
      )}
    </View>
  );
}
