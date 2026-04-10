import { View, Text, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { shortenAddress } from "@/lib/format";

interface Props {
  label: string;
  address: string;
  full?: boolean;
}

export function AddressDisplay({ label, address, full = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Pressable onPress={copy} className="bg-neutral-900 p-4 rounded-xl">
      <Text className="text-neutral-400 text-xs mb-1">{label}</Text>
      <Text className="text-white" numberOfLines={full ? undefined : 1}>
        {full ? address : shortenAddress(address)}
      </Text>
      <Text className="text-neutral-500 text-xs mt-1">
        {copied ? "Copied!" : "Tap to copy"}
      </Text>
    </Pressable>
  );
}
