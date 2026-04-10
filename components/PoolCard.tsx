import { View, Text, Pressable } from "react-native";
import type { StakerPool, StakedPosition } from "@/lib/earn";
import { formatBalance } from "@/lib/format";

interface Props {
  pool: StakerPool;
  position: StakedPosition | null;
  onStake: () => void;
  onClaim: () => void;
  onUnstake: () => void;
}

export function PoolCard({ pool, position, onStake, onClaim, onUnstake }: Props) {
  const hasPosition = position !== null;
  const noRewards = !position || position.rewards.isZero();

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-3">
      {/* Header row */}
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-white text-base font-semibold">{pool.validatorName}</Text>
        <Text className="text-neutral-400 text-xs">
          APY: {pool.apyPercent != null ? `${pool.apyPercent}%` : "\u2014"}
          {pool.commissionPercent != null ? `  ${pool.commissionPercent}% fee` : ""}
        </Text>
      </View>
      <Text className="text-neutral-500 text-xs mb-3">
        Total: {formatBalance(pool.totalDelegated)} {pool.token.symbol}
      </Text>

      {/* Position section */}
      {hasPosition && (
        <>
          <View className="border-t border-neutral-800 pt-3 mb-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-neutral-400 text-sm">
                Your stake: <Text className="text-white">{formatBalance(position.staked)} STRK</Text>
              </Text>
              <Text className="text-neutral-400 text-sm">
                Rewards: <Text className="text-green-400">{formatBalance(position.rewards)} STRK</Text>
              </Text>
            </View>
            {!position.unpooling.isZero() && (
              <Text className="text-yellow-500 text-xs mt-1">
                Unstaking: {formatBalance(position.unpooling)} STRK
                {position.unpoolTime ? ` — ready ${position.unpoolTime.toLocaleDateString()}` : ""}
              </Text>
            )}
          </View>

          <View className="flex-row gap-2 mb-2">
            <Pressable
              onPress={onClaim}
              disabled={noRewards}
              className={`flex-1 py-2.5 rounded-xl ${noRewards ? "bg-neutral-800" : "bg-green-800"}`}
            >
              <Text className={`text-center text-sm font-semibold ${noRewards ? "text-neutral-600" : "text-white"}`}>
                Claim Rewards
              </Text>
            </Pressable>
            <Pressable
              onPress={onUnstake}
              className="flex-1 bg-neutral-800 py-2.5 rounded-xl"
            >
              <Text className="text-white text-center text-sm font-semibold">Unstake</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Stake CTA */}
      <Pressable
        onPress={onStake}
        className="bg-purple-700 py-3 rounded-xl"
      >
        <Text className="text-white text-center font-semibold">
          {hasPosition ? "+ Stake more STRK" : "Stake STRK"}
        </Text>
      </Pressable>
    </View>
  );
}
