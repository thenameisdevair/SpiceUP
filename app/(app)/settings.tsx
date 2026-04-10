import { View, Text, Pressable } from "react-native";
import { usePrivy } from "@privy-io/expo";
import { useAuthStore } from "@/stores/auth";
import { secureGet } from "@/lib/secure";
import { useState } from "react";

export default function Settings() {
  const { logout } = usePrivy();
  const reset = useAuthStore((s) => s.reset);
  const { starknetAddress, tongoRecipientId } = useAuthStore();
  const [key, setKey] = useState<string | null>(null);

  async function exportKey() {
    const k = await secureGet("tongoPrivateKey");
    setKey(k);
  }

  async function doLogout() {
    await logout();
    reset();
  }

  const recipientDisplay = tongoRecipientId
    ? `${String(tongoRecipientId.x).slice(0, 16)}...`
    : "N/A";

  return (
    <View className="flex-1 bg-background px-6 pt-20">
      <Text className="text-white text-2xl font-bold mb-6">Settings</Text>

      <Text className="text-neutral-400 mb-1">Starknet</Text>
      <Text className="text-white mb-4" numberOfLines={1}>
        {starknetAddress}
      </Text>

      <Text className="text-neutral-400 mb-1">Tongo recipient</Text>
      <Text className="text-white mb-6" numberOfLines={1}>
        {recipientDisplay}
      </Text>

      <Pressable onPress={exportKey} className="bg-neutral-800 p-4 rounded-xl mb-3">
        <Text className="text-white text-center">Export Tongo private key</Text>
      </Pressable>
      {key && <Text className="text-yellow-400 text-xs mb-3">{key}</Text>}

      <Pressable onPress={doLogout} className="bg-red-900 p-4 rounded-xl">
        <Text className="text-white text-center">Log out</Text>
      </Pressable>
    </View>
  );
}
