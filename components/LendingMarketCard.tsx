import { View, Text, Pressable } from "react-native";
import type { LendingMarket } from "starkzap";
import type { AppLendingPosition } from "@/lib/earn";

interface Props {
  market: LendingMarket;
  position: AppLendingPosition | null;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function LendingMarketCard({ market, position, onDeposit, onWithdraw }: Props) {
  const apyLabel = position?.apyPercent != null
    ? `${position.apyPercent.toFixed(2)}%`
    : market.stats?.supplyApy != null ? "..." : "\u2014";

  const marketName = market.poolName ?? "Vesu";
  const tokenSymbol = market.asset.symbol;

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-3">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-white text-base font-semibold">
          {tokenSymbol}  —  {marketName}
        </Text>
        <Text className="text-neutral-400 text-xs">APY: {apyLabel}</Text>
      </View>

      {/* Position section */}
      {position && (
        <>
          <View className="border-t border-neutral-800 pt-3 mb-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-neutral-400 text-sm">
                Deposited:{" "}
                <Text className="text-white">
                  {position.depositedAmount} {tokenSymbol}
                </Text>
              </Text>
              <Text className="text-neutral-400 text-sm">{position.usdValue}</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-2">
            <Pressable onPress={onDeposit} className="flex-1 bg-purple-700 py-2.5 rounded-xl">
              <Text className="text-white text-center text-sm font-semibold">Deposit More</Text>
            </Pressable>
            <Pressable onPress={onWithdraw} className="flex-1 bg-neutral-800 py-2.5 rounded-xl">
              <Text className="text-white text-center text-sm font-semibold">Withdraw</Text>
            </Pressable>
          </View>
        </>
      )}

      {!position && (
        <Pressable onPress={onDeposit} className="bg-purple-700 py-3 rounded-xl mt-2">
          <Text className="text-white text-center font-semibold">Deposit {tokenSymbol}</Text>
        </Pressable>
      )}
    </View>
  );
}
