// components/AmountInput.tsx
import { useState, useCallback } from "react";
import { View, TextInput, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { Token } from "starkzap";
import { ALL_TOKENS } from "@/constants/tokens";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
  maxAmount?: string;
  invalid?: boolean;
}

export function AmountInput({
  value,
  onChangeText,
  selectedToken,
  onSelectToken,
  maxAmount,
  invalid = false,
}: Props) {
  const shakeX = useSharedValue(0);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming( 8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming( 6, { duration: 50 }),
      withTiming( 0, { duration: 50 }),
    );
  }, [shakeX]);

  const prevInvalid = useState(false);
  if (invalid && !prevInvalid[0]) {
    triggerShake();
  }
  prevInvalid[1](invalid);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: invalid ? COLORS.error : COLORS.border,
          overflow: "hidden",
        },
        animatedStyle,
      ]}
    >
      {/* Numeric input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="decimal-pad"
        style={{
          flex: 1,
          color: COLORS.textPrimary,
          fontFamily: "Inter-SemiBold",
          fontSize: 24,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
        }}
      />

      {/* Max button */}
      {maxAmount !== undefined && (
        <Pressable
          onPress={() => onChangeText(maxAmount)}
          style={{ justifyContent: "center", paddingHorizontal: SPACING.sm }}
        >
          <Text style={{
            color: COLORS.accent,
            fontFamily: "Inter-SemiBold",
            fontSize: 12,
            backgroundColor: COLORS.accentSubtle,
            paddingHorizontal: SPACING.sm,
            paddingVertical: 4,
            borderRadius: RADIUS.sm,
          }}>
            MAX
          </Text>
        </Pressable>
      )}

      {/* Token selector */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingRight: SPACING.sm, gap: 4 }}>
        {ALL_TOKENS.map((token) => {
          const active = selectedToken.symbol === token.symbol;
          return (
            <Pressable
              key={token.symbol}
              onPress={() => onSelectToken(token)}
              style={{
                paddingHorizontal: SPACING.sm,
                paddingVertical: 6,
                borderRadius: RADIUS.sm,
                backgroundColor: active ? COLORS.accent : COLORS.surfaceAlt,
              }}
            >
              <Text style={{
                color: active ? COLORS.textPrimary : COLORS.textSecondary,
                fontFamily: active ? "Inter-SemiBold" : "Inter-Regular",
                fontSize: 13,
              }}>
                {token.symbol}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
