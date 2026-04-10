// components/PrivacyBadge.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/ui";

interface Props {
  size?: "sm" | "md";
}

const CONFIG = {
  sm: { px: 6,  py: 2,  text: 9,  icon: 10 },
  md: { px: 8,  py: 3,  text: 11, icon: 13 },
} as const;

export function PrivacyBadge({ size = "sm" }: Props) {
  const c = CONFIG[size];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.privateSubtle,
        paddingHorizontal: c.px,
        paddingVertical: c.py,
        borderRadius: 999,
        gap: 3,
      }}
    >
      <Ionicons name="lock-closed" size={c.icon} color={COLORS.private} />
      <Text style={{ color: COLORS.private, fontSize: c.text, fontFamily: "Inter-Medium" }}>
        Private
      </Text>
    </View>
  );
}
