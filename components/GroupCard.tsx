import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Group } from "@/lib/groups";
import { calcNetBalances } from "@/lib/groups";
import { getCachedExpenses } from "@/lib/groupsCache";

interface GroupCardProps {
  group: Group;
  selfId: string;
  onPress: () => void;
}

export function GroupCard({ group, selfId, onPress }: GroupCardProps) {
  const cachedExpenses = getCachedExpenses(group.id);
  const net = calcNetBalances(cachedExpenses, [], selfId);
  const totalOwed = net
    .filter((b) => b.fromUserId === selfId)
    .reduce((s, b) => s + b.amount, 0);
  const totalOwing = net
    .filter((b) => b.toUserId === selfId)
    .reduce((s, b) => s + b.amount, 0);

  const primaryToken = cachedExpenses[0]?.token ?? "";
  let balanceText = "Settled up";
  let balanceColor = "text-neutral-500";

  if (totalOwed > 0.005) {
    balanceText = `You owe ${totalOwed.toFixed(2)} ${primaryToken}`;
    balanceColor = "text-red-400";
  } else if (totalOwing > 0.005) {
    balanceText = `You're owed ${totalOwing.toFixed(2)} ${primaryToken}`;
    balanceColor = "text-green-400";
  }

  return (
    <Pressable onPress={onPress} className="bg-neutral-900 rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-3">
          <Text className="text-white font-bold text-base">{group.name}</Text>
          <Text className="text-neutral-500 text-sm mt-0.5">
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className={`${balanceColor} text-sm font-medium mr-2`}>
            {balanceText}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#6b7280" />
        </View>
      </View>
    </Pressable>
  );
}
