import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";

import type { ConfidentialRecipient } from "starkzap";

function formatRecipientId(r: ConfidentialRecipient | null): string {
  if (!r) return "pending";
  return `${String(r.x).slice(0, 10)}...${String(r.y).slice(0, 10)}...`;
}

export default function Home() {
  const router = useRouter();
  const { status, starknetAddress, tongoRecipientId, error } = useAuthStore();

  if (status !== "ready") {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator color="#7B5EA7" />
        <Text className="text-neutral-400 mt-4">
          {status === "error" ? error : "Setting up your wallet\u2026"}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 pt-20">
      <Text className="text-white text-2xl font-bold mb-8">SpiceUP</Text>

      <View className="bg-neutral-900 p-4 rounded-xl mb-3">
        <Text className="text-neutral-400 text-xs mb-1">Starknet address</Text>
        <Text className="text-white" numberOfLines={1}>
          {starknetAddress}
        </Text>
      </View>

      <View className="bg-neutral-900 p-4 rounded-xl mb-8">
        <Text className="text-neutral-400 text-xs mb-1">Private address (Tongo)</Text>
        <Text className="text-white" numberOfLines={1}>
          {formatRecipientId(tongoRecipientId)}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/(app)/settings")}
        className="bg-neutral-800 p-4 rounded-xl"
      >
        <Text className="text-white text-center">Settings</Text>
      </Pressable>
    </View>
  );
}
