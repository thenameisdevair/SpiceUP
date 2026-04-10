// components/Skeleton.tsx
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { COLORS, RADIUS } from "@/constants/ui";

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonBox({
  width = "100%",
  height,
  borderRadius = RADIUS.md,
  style,
}: SkeletonBoxProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      [COLORS.surface, COLORS.surfaceAlt],
    ),
  }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius }, animatedStyle, style]}
    />
  );
}

interface SkeletonTextProps {
  width?: number | `${number}%`;
  fontSize?: number;
  lines?: number;
  gap?: number;
}

export function SkeletonText({
  width = "70%",
  fontSize = 14,
  lines = 1,
  gap = 6,
}: SkeletonTextProps) {
  const lineHeight = Math.round(fontSize * 1.3);
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 && lines > 1 ? "50%" : width}
          height={lineHeight}
          borderRadius={RADIUS.sm}
        />
      ))}
    </View>
  );
}
