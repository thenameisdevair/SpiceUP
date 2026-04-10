import { View, Text, Pressable } from "react-native";
import type { ConfidentialState } from "starkzap";

interface Props {
  state: ConfidentialState | null;
  available: boolean;
  needsRollover: boolean;
  onRollover: () => void;
}

export function ConfidentialBalanceCard({ state, available, needsRollover, onRollover }: Props) {
  if (!available) {
    return (
      <View className="bg-neutral-900 p-4 rounded-xl mb-3 border border-neutral-800">
        <Text className="text-neutral-500 text-sm">
          Confidential balance unavailable — contract not deployed
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-neutral-900 p-4 rounded-xl mb-3 border border-purple-900/50">
      <View className="flex-row items-center mb-2">
        <Text className="text-white font-semibold text-base">Private Balance</Text>
        <View className="bg-purple-900/60 px-2 py-0.5 rounded ml-2">
          <Text className="text-purple-300 text-xs">Private</Text>
        </View>
      </View>

      <Text className="text-white text-lg font-medium">
        {state ? String(state.balance) : "\u2014"}
      </Text>

      {needsRollover && (
        <Pressable onPress={onRollover} className="mt-3 bg-purple-800 p-3 rounded-lg">
          <Text className="text-white text-center text-sm font-medium">
            Activate pending balance ({String(state?.pending ?? 0n)})
          </Text>
        </Pressable>
      )}
    </View>
  );
}
