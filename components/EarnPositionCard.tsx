import { View, Text, Pressable } from "react-native";

interface Props {
  title: string;
  subtitle: string;
  apyLabel: string;
  balanceLabel: string;
  badgeLabel?: string;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
}

export function EarnPositionCard({
  title,
  subtitle,
  apyLabel,
  balanceLabel,
  badgeLabel,
  onPrimaryAction,
  primaryActionLabel,
  onSecondaryAction,
  secondaryActionLabel,
}: Props) {
  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-white text-base font-semibold">{title}</Text>
            {badgeLabel && (
              <View className="bg-purple-900/60 px-2 py-0.5 rounded">
                <Text className="text-purple-300 text-[10px]">{badgeLabel}</Text>
              </View>
            )}
          </View>
          <Text className="text-neutral-500 text-xs mt-0.5">{subtitle}</Text>
        </View>
        <Text className="text-neutral-400 text-xs">APY: {apyLabel}</Text>
      </View>

      <Text className="text-white text-sm font-medium mb-3">{balanceLabel}</Text>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onPrimaryAction}
          className="flex-1 bg-purple-700 py-2.5 rounded-xl"
        >
          <Text className="text-white text-center text-sm font-semibold">{primaryActionLabel}</Text>
        </Pressable>
        {onSecondaryAction && secondaryActionLabel && (
          <Pressable
            onPress={onSecondaryAction}
            className="flex-1 bg-neutral-800 py-2.5 rounded-xl"
          >
            <Text className="text-white text-center text-sm font-semibold">{secondaryActionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
