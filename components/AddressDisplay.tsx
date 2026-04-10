// components/AddressDisplay.tsx
import { useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

interface Props {
  address: string;
  label?: string;
  showShare?: boolean;
  trimLength?: number;
}

function shorten(address: string, trimLength: number): string {
  if (address.length <= trimLength * 2 + 3) return address;
  return `${address.slice(0, trimLength)}…${address.slice(-trimLength)}`;
}

export function AddressDisplay({
  address,
  label,
  showShare = false,
  trimLength = 6,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    await Share.share({ message: address });
  }

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
      }}
    >
      {label && (
        <Text style={{
          color: COLORS.textTertiary,
          fontFamily: "Inter-Regular",
          fontSize: 12,
          marginRight: SPACING.xs,
        }}>
          {label}
        </Text>
      )}

      <Text
        style={{
          flex: 1,
          color: COLORS.textSecondary,
          fontFamily: "Inter-Regular",
          fontSize: 13,
          letterSpacing: 0.3,
        }}
        numberOfLines={1}
      >
        {shorten(address, trimLength)}
      </Text>

      <Pressable onPress={handleCopy} hitSlop={8}>
        <Ionicons
          name={copied ? "checkmark-circle" : "copy-outline"}
          size={18}
          color={copied ? COLORS.success : COLORS.textTertiary}
        />
      </Pressable>

      {showShare && (
        <Pressable onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={18} color={COLORS.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}
