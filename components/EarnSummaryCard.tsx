import { View, Text } from "react-native";
import type { StakedPosition, AppLendingPosition } from "@/lib/earn";
import { formatBalance } from "@/lib/format";

interface Props {
  stakedPositions: StakedPosition[];
  lendingPositions: AppLendingPosition[];
}

export function EarnSummaryCard({ stakedPositions, lendingPositions }: Props) {
  // Sum staked amounts across all positions (display first non-zero or "0")
  const totalStakedLabel = stakedPositions.length > 0
    ? stakedPositions.map((p) => formatBalance(p.staked)).join(" + ") + " STRK"
    : "0 STRK";

  // Sum rewards
  const totalRewardsLabel = stakedPositions.length > 0
    ? stakedPositions
        .filter((p) => !p.rewards.isZero())
        .map((p) => formatBalance(p.rewards))
        .join(" + ") + " STRK"
    : null;

  // Sum lending positions
  const totalLentLabel = lendingPositions.length > 0
    ? lendingPositions
        .map((p) => `${p.depositedAmount} ${p.token.symbol}`)
        .join(", ")
    : null;

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mx-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white text-base font-semibold">Total Earning</Text>
        <Text className="text-neutral-400 text-base">$\u2014</Text>
      </View>

      <View className="flex-row gap-4 flex-wrap">
        <View>
          <Text className="text-neutral-500 text-xs mb-0.5">Staked</Text>
          <Text className="text-white text-sm font-medium">{totalStakedLabel}</Text>
        </View>
        {totalLentLabel && (
          <View>
            <Text className="text-neutral-500 text-xs mb-0.5">Lent</Text>
            <Text className="text-white text-sm font-medium">{totalLentLabel}</Text>
          </View>
        )}
      </View>

      {totalRewardsLabel && (
        <Text className="text-green-400 text-xs mt-2">
          Rewards claimable: {totalRewardsLabel}
        </Text>
      )}
    </View>
  );
}
