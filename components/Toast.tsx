// components/Toast.tsx
import { useEffect } from "react";
import { View, Text, Pressable, SafeAreaView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useToastStore, type ToastVariant } from "@/stores/toast";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

const VARIANT_STYLE: Record<ToastVariant, { bg: string; icon: string; color: string }> = {
  success: { bg: COLORS.successSubtle, icon: "checkmark-circle-outline", color: COLORS.success },
  error:   { bg: COLORS.errorSubtle,   icon: "alert-circle-outline",     color: COLORS.error },
  info:    { bg: COLORS.surfaceAlt,    icon: "information-circle-outline", color: COLORS.textSecondary },
};

function ToastBanner() {
  const { message, variant, visible, hide } = useToastStore();
  const translateY = useSharedValue(-80);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      const timer = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 300 });
        setTimeout(hide, 320);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const v = VARIANT_STYLE[variant];

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          top: 0,
          left: SPACING.pageH,
          right: SPACING.pageH,
          zIndex: 9999,
        },
        style,
      ]}
    >
      <SafeAreaView>
        <Pressable
          onPress={hide}
          style={{
            backgroundColor: v.bg,
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.sm,
            padding: SPACING.md,
            borderRadius: RADIUS.lg,
            borderLeftWidth: 3,
            borderLeftColor: v.color,
            marginTop: SPACING.sm,
          }}
        >
          <Ionicons name={v.icon as any} size={20} color={v.color} />
          <Text style={{
            flex: 1,
            color: COLORS.textPrimary,
            fontFamily: "Inter-Medium",
            fontSize: 14,
          }}>
            {message}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <ToastBanner />
    </View>
  );
}
