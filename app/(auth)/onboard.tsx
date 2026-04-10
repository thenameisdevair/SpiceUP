import { useRef, useState, useCallback } from "react";
import {
  View, Text, Pressable, FlatList, Dimensions, StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  titleAccent: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: "privacy",
    icon: "shield-checkmark-outline",
    iconColor: COLORS.accent,
    title: "Send money",
    titleAccent: "privately",
    body: "Amounts are hidden on-chain using zero-knowledge proofs. Not even the blockchain reveals what you sent.",
  },
  {
    key: "gasless",
    icon: "flash-outline",
    iconColor: "#F59E0B",
    title: "No gas fees,",
    titleAccent: "ever",
    body: "We cover every transaction cost. You'll never be asked to buy ETH just to send a payment.",
  },
  {
    key: "nokey",
    icon: "mail-outline",
    iconColor: COLORS.success,
    title: "Sign in with Google —",
    titleAccent: "no seed phrases",
    body: "Your wallet is created from your Google or email account. No 12-word phrases, no browser extensions.",
  },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dot({ index, scrollX }: { index: number; scrollX: Animated.SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W];
    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: RADIUS.full,
          backgroundColor: COLORS.accent,
          marginHorizontal: 3,
        },
        style,
      ]}
    />
  );
}

// ─── Single slide ─────────────────────────────────────────────────────────────

function SlideItem({ item }: { item: Slide }) {
  return (
    <View
      style={{
        width: SCREEN_W,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: SPACING.pageH + SPACING.lg,
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: COLORS.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.xxl,
          borderWidth: 1.5,
          borderColor: COLORS.border,
        }}
      >
        <Ionicons name={item.icon} size={48} color={item.iconColor} />
      </View>

      {/* Title — normal + accent */}
      <Text style={{
        color: COLORS.textPrimary,
        fontFamily: "Inter-Bold",
        fontSize: 28,
        textAlign: "center",
        lineHeight: 36,
        marginBottom: SPACING.sm,
      }}>
        {item.title}{" "}
        <Text style={{ color: COLORS.accent }}>{item.titleAccent}</Text>
      </Text>

      {/* Accent underline bar */}
      <View style={{
        width: 40,
        height: 3,
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.xl,
      }} />

      {/* Body */}
      <Text style={{
        color: COLORS.textSecondary,
        fontFamily: "Inter-Regular",
        fontSize: 15,
        textAlign: "center",
        lineHeight: 23,
      }}>
        {item.body}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Onboard() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const isLast = activeIndex === SLIDES.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      router.replace("/(auth)/login");
    } else {
      const next = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  }, [activeIndex, isLast, router]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        style={{
          position: "absolute",
          top: 56,
          right: SPACING.pageH,
          zIndex: 10,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xs,
        }}
      >
        <Text style={{
          color: COLORS.textTertiary,
          fontFamily: "Inter-Medium",
          fontSize: 14,
        }}>
          Skip
        </Text>
      </Pressable>

      {/* Slide list */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={({ item }) => <SlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
        style={{ flex: 1 }}
      />

      {/* Bottom: dots + button */}
      <View style={{
        paddingHorizontal: SPACING.pageH,
        paddingBottom: 52,
        gap: SPACING.xl,
        alignItems: "center",
      }}>
        {/* Dots */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {SLIDES.map((_, i) => <Dot key={i} index={i} scrollX={scrollX} />)}
        </View>

        {/* CTA */}
        <Pressable
          onPress={goNext}
          style={({ pressed }) => ({
            backgroundColor: pressed ? COLORS.accentDim : COLORS.accent,
            width: "100%",
            padding: SPACING.lg,
            borderRadius: RADIUS.lg,
            alignItems: "center",
          })}
        >
          <Text style={{
            color: COLORS.textPrimary,
            fontFamily: "Inter-SemiBold",
            fontSize: 16,
          }}>
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
