// components/BalanceCard.tsx
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Amount, Token } from "starkzap";
import { formatBalance, toFiat } from "@/lib/format";
import { SkeletonBox, SkeletonText } from "@/components/Skeleton";
import { COLORS, RADIUS, SPACING } from "@/constants/ui";

interface Props {
  token: Token;
  balance: Amount | null;
  loading?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

export function BalanceCard({ token, balance, loading = false, onPress, compact = false }: Props) {
  const [hidden, setHidden]     = useState(false);
  const [showFiat, setShowFiat] = useState(true);

  if (loading) {
    return (
      <View
        style={{
          backgroundColor: COLORS.surface,
          padding: SPACING.lg,
          borderRadius: RADIUS.lg,
          marginBottom: SPACING.sm,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 6 }}>
          <SkeletonText width={48} fontSize={13} />
          <SkeletonText width={80} fontSize={11} />
        </View>
        <SkeletonText width={72} fontSize={16} />
      </View>
    );
  }

  const primaryAmount = hidden
    ? "••••••"
    : showFiat
    ? toFiat(balance, token.symbol)
    : formatBalance(balance) + " " + token.symbol;

  const secondaryAmount = hidden
    ? "••••"
    : showFiat
    ? formatBalance(balance) + " " + token.symbol
    : toFiat(balance, token.symbol);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
        padding: compact ? SPACING.md : SPACING.lg,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      })}
    >
      {/* Left: token identity */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: COLORS.accentSubtle,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: COLORS.accent, fontFamily: "Inter-Bold", fontSize: 12 }}>
            {token.symbol.slice(0, 2)}
          </Text>
        </View>
        <View>
          <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-SemiBold", fontSize: 14 }}>
            {token.symbol}
          </Text>
          <Text style={{ color: COLORS.textTertiary, fontFamily: "Inter-Regular", fontSize: 11, marginTop: 1 }}>
            {token.name}
          </Text>
        </View>
      </View>

      {/* Right: amounts + controls */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <View style={{ alignItems: "flex-end" }}>
          <Pressable onPress={() => setShowFiat((v) => !v)}>
            <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-SemiBold", fontSize: 16 }}>
              {primaryAmount}
            </Text>
          </Pressable>
          <Text style={{ color: COLORS.textTertiary, fontFamily: "Inter-Regular", fontSize: 11, marginTop: 2 }}>
            {secondaryAmount}
          </Text>
        </View>

        <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={COLORS.textTertiary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}
