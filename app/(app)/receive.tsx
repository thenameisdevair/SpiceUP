import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import QRCode from "react-native-qrcode-svg";
import { useAuthStore } from "@/stores/auth";
import { AddressDisplay } from "@/components/AddressDisplay";

type Mode = "public" | "private";

export default function Receive() {
  const [mode, setMode] = useState<Mode>("public");
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);

  // Serialize recipientId for QR: "tongo:<x>:<y>"
  const tongoQrValue = tongoRecipientId
    ? `tongo:${String(tongoRecipientId.x)}:${String(tongoRecipientId.y)}`
    : "";

  const address = mode === "public" ? starknetAddress ?? "" : tongoQrValue;
  const label = mode === "public" ? "Starknet Address" : "Private Address (Tongo)";

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">Receive</Text>

      {/* Toggle */}
      <View className="flex-row bg-neutral-900 rounded-xl p-1 mb-8">
        <Pressable
          onPress={() => setMode("public")}
          className={`flex-1 p-3 rounded-lg ${mode === "public" ? "bg-accent" : ""}`}
        >
          <Text className={`text-center font-medium ${mode === "public" ? "text-white" : "text-neutral-400"}`}>
            Public
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("private")}
          className={`flex-1 p-3 rounded-lg ${mode === "private" ? "bg-accent" : ""}`}
        >
          <Text className={`text-center font-medium ${mode === "private" ? "text-white" : "text-neutral-400"}`}>
            Private
          </Text>
        </Pressable>
      </View>

      {/* QR Code */}
      <View className="items-center mb-8">
        <View className="bg-white p-4 rounded-2xl">
          <QRCode value={address || "empty"} size={200} />
        </View>
      </View>

      {/* Address */}
      <AddressDisplay label={label} address={address} full />

      {mode === "private" && (
        <Text className="text-neutral-500 text-xs text-center mt-4">
          Share this address to receive private transfers. Amounts will be hidden on-chain.
        </Text>
      )}
    </View>
  );
}
