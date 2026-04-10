// components/EmptyState.tsx
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

interface Props {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.xxl * 2,
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: COLORS.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.sm,
        }}
      >
        <Ionicons name={icon} size={30} color={COLORS.textMuted} />
      </View>

      <Text style={{
        color: COLORS.textPrimary,
        fontFamily: "Inter-SemiBold",
        fontSize: 16,
        textAlign: "center",
      }}>
        {title}
      </Text>

      {body && (
        <Text style={{
          color: COLORS.textTertiary,
          fontFamily: "Inter-Regular",
          fontSize: 14,
          textAlign: "center",
          lineHeight: 20,
        }}>
          {body}
        </Text>
      )}

      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({
            marginTop: SPACING.sm,
            backgroundColor: pressed ? COLORS.accentDim : COLORS.accent,
            paddingHorizontal: SPACING.xl,
            paddingVertical: SPACING.md,
            borderRadius: RADIUS.full,
          })}
        >
          <Text style={{
            color: COLORS.textPrimary,
            fontFamily: "Inter-SemiBold",
            fontSize: 14,
          }}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
