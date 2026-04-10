# Category 7 — UI/UX & Navigation (Detailed Plan)

> **Goal**: A polished, consumer-grade interface that feels like a fintech app, not a crypto app. Layer animations, skeleton loaders, a formal design system, and redesigned screens on top of the working Categories 1–6 feature set.

---

## Context

- Categories 1–6 complete: Privy auth, Starkzap wallet, public/private transfers, fund/withdraw, group expenses with Supabase, and full yield/earn surface (staking, DCA, lending) all working.
- Existing UI is intentionally minimal. `onboard.tsx` even carries the comment `// Minimal 3-slide explainer. Not polished — Cat 7 will redesign.`
- `BalanceCard`, `TransactionItem`, `AmountInput`, and `GroupCard` are functional but unstyled stubs — they use NativeWind utility classes directly with no animation, no loading states, and no fiat-toggle logic.
- `tailwind.config.js` already defines `background: "#0D0D0D"`, `accent: "#7B5EA7"`, and `success: "#4CAF50"` — these are the canonical palette; everything in Cat 7 extends from them.
- `lib/format.ts` has `formatBalance()` and a `toFiat()` stub that returns `"$—"` — both are reused as-is; Cat 7 only wraps them with display state logic.
- `react-native-reanimated` is already installed (required by Cat 1). All animation in this category uses it exclusively — no `Animated` from core React Native.
- `expo-font` is already listed as an Expo SDK package — just needs to be called. Inter font files must be added to `assets/fonts/`.
- `@expo/vector-icons` (`Ionicons`) is already available — used for all icons.
- This category ships zero new library installs beyond `expo-camera` (QR scanner) and the Inter font asset files.

---

## 7.1 Design System (`constants/ui.ts` + Font Loading)

> PRD 7.3: Color palette — dark background (#0D0D0D), accent purple (#7B5EA7), success green (#4CAF50). Typography: Inter font (expo-font). Skeleton loaders for all async data.

### Font Asset Setup

Download the Inter variable font or individual weights and place them at:

```
assets/fonts/
├── Inter-Regular.ttf
├── Inter-Medium.ttf
├── Inter-SemiBold.ttf
└── Inter-Bold.ttf
```

Source: `https://fonts.google.com/specimen/Inter` — download the static TTF variants. Add all four to `assets/fonts/`.

### `constants/ui.ts` (NEW)

Centralises every design token. Every component and screen references this file instead of hard-coding hex values or raw pixel numbers.

```typescript
// constants/ui.ts

// ─── Colors ──────────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  background:    "#0D0D0D",   // app root background
  surface:       "#141414",   // card / sheet surface
  surfaceAlt:    "#1A1A1A",   // secondary card (slightly lighter)
  border:        "#222222",   // dividers, card borders

  // Brand
  accent:        "#7B5EA7",   // purple — primary CTA, active tab
  accentDim:     "#4A3870",   // pressed state / muted purple fill
  accentSubtle:  "#2A1F42",   // badge backgrounds, chip fills

  // Semantic
  success:       "#4CAF50",
  successSubtle: "#1A3B1C",
  error:         "#EF4444",
  errorSubtle:   "#3B1A1A",
  warning:       "#F59E0B",
  warningSubtle: "#3B2A0A",

  // Text
  textPrimary:   "#FFFFFF",
  textSecondary: "#A3A3A3",   // neutral-400 equivalent
  textTertiary:  "#737373",   // neutral-500 — metadata, timestamps
  textMuted:     "#404040",   // neutral-700 — disabled / placeholder

  // Amounts
  positive:      "#4ADE80",   // green-400 — inbound
  negative:      "#F87171",   // red-400 — outbound

  // Private / Tongo
  private:       "#C084FC",   // purple-400 — private tx label
  privateSubtle: "#3B1F5C",   // private badge background
} as const;

export type ColorKey = keyof typeof COLORS;

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONTS = {
  regular:  "Inter-Regular",
  medium:   "Inter-Medium",
  semiBold: "Inter-SemiBold",
  bold:     "Inter-Bold",
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  pageH: 24,   // horizontal page padding
  pageT: 60,   // top padding (below status bar)
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
// Use sparingly on dark backgrounds. These are for elevated cards/modals.

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

export const TAB_BAR = {
  backgroundColor: COLORS.background,
  borderTopColor:  COLORS.border,
  activeTintColor: COLORS.accent,
  inactiveTintColor: COLORS.textMuted,
  height: 60,
} as const;
```

### Updated `app/_layout.tsx` — Font Loading Gate

Replace the existing root layout to block rendering until Inter is loaded, then hide the splash screen.

```typescript
// app/_layout.tsx
import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { PrivyProvider } from "@privy-io/expo";
import { ENV } from "@/lib/env";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthInit } from "@/hooks/useAuthInit";
import { initGroupsDb } from "@/lib/groupsCache";
import { ToastProvider } from "@/components/Toast";
import "../global.css";

// Prevent the splash screen from auto-hiding before fonts are ready.
SplashScreen.preventAutoHideAsync();

function Gate() {
  useAuthGuard();
  useAuthInit();

  useEffect(() => {
    initGroupsDb();
  }, []);

  return (
    <ToastProvider>
      <Slot />
    </ToastProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular":  require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium":   require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold":     require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts resolve (prevents flash of system font).
  if (!fontsLoaded && !fontError) return null;

  return (
    <PrivyProvider appId={ENV.PRIVY_APP_ID} clientId={ENV.PRIVY_CLIENT_ID}>
      <Gate />
    </PrivyProvider>
  );
}
```

### NativeWind Font Integration

Add `fontFamily` entries to `tailwind.config.js` so NativeWind utilities can reference the loaded Inter fonts:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background:    "#0D0D0D",
        surface:       "#141414",
        "surface-alt": "#1A1A1A",
        accent:        "#7B5EA7",
        "accent-dim":  "#4A3870",
        success:       "#4CAF50",
        error:         "#EF4444",
      },
      fontFamily: {
        sans:      ["Inter-Regular"],
        medium:    ["Inter-Medium"],
        semibold:  ["Inter-SemiBold"],
        bold:      ["Inter-Bold"],
      },
    },
  },
  plugins: [],
};
```

Usage in components: `className="font-semibold"` resolves to `Inter-SemiBold`.

---

## 7.2 Skeleton Loader (`components/Skeleton.tsx`)

> PRD 7.3: Skeleton loaders for all async data.

Shimmer effect using reanimated `withRepeat` + `withTiming`. No external library needed.

```typescript
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

/** Renders N lines of skeleton text with the given approximate font size. */
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
          // Last line is shorter to look natural
          width={i === lines - 1 && lines > 1 ? "50%" : width}
          height={lineHeight}
          borderRadius={RADIUS.sm}
        />
      ))}
    </View>
  );
}
```

### Skeleton Usage Pattern — BalanceCard Loading State

```tsx
// Example: show skeletons while balances load
{loading ? (
  <View className="bg-surface p-4 rounded-xl mb-3">
    <SkeletonText width="40%" fontSize={14} />
    <View style={{ height: 8 }} />
    <SkeletonText width="60%" fontSize={22} />
  </View>
) : (
  <BalanceCard token={STRK} balance={balances.STRK} />
)}
```

### Skeleton Usage Pattern — Transaction List

```tsx
{historyLoading
  ? Array.from({ length: 5 }).map((_, i) => (
      <View key={i} className="flex-row items-center py-3 border-b border-border">
        <View className="flex-1 gap-1.5">
          <SkeletonText width="40%" fontSize={13} />
          <SkeletonText width="25%" fontSize={11} />
        </View>
        <SkeletonText width={60} fontSize={13} />
      </View>
    ))
  : history.slice(0, 10).map((tx) => <TransactionItem key={tx.id} tx={tx} />)
}
```

---

## 7.3 Shared Component Rewrites

> PRD 7.2: BalanceCard, TransactionItem, AmountInput, GroupCard, AddressDisplay, QRScanner, PrivacyBadge.

---

### PrivacyBadge (`components/PrivacyBadge.tsx`) — Extract First

Extract from `TransactionItem` before rewriting it so the badge is shared:

```typescript
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
```

---

### BalanceCard (`components/BalanceCard.tsx`) — Full Rewrite

Adds hide/show toggle, fiat/token display toggle, skeleton prop, and a press handler.

```typescript
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
  /** Called when the card body is tapped (e.g. navigate to token detail). */
  onPress?: () => void;
  /** If true, renders a compact row style instead of a full card. */
  compact?: boolean;
}

export function BalanceCard({ token, balance, loading = false, onPress, compact = false }: Props) {
  const [hidden, setHidden]    = useState(false);
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
          {/* Primary amount — tappable to toggle fiat/token */}
          <Pressable onPress={() => setShowFiat((v) => !v)}>
            <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-SemiBold", fontSize: 16 }}>
              {primaryAmount}
            </Text>
          </Pressable>
          <Text style={{ color: COLORS.textTertiary, fontFamily: "Inter-Regular", fontSize: 11, marginTop: 2 }}>
            {secondaryAmount}
          </Text>
        </View>

        {/* Hide / show toggle */}
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
```

---

### TransactionItem (`components/TransactionItem.tsx`) — Full Rewrite

Adds type-to-label mapping, directional icon, and smart relative timestamp.

```typescript
// components/TransactionItem.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TxRecord } from "@/lib/txHistory";
import { shortenAddress } from "@/lib/format";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

// ─── Label & direction map ────────────────────────────────────────────────────

type Direction = "out" | "in" | "neutral";

const TX_META: Record<
  TxRecord["type"],
  { label: string; direction: Direction; icon: string }
> = {
  send:           { label: "Sent",          direction: "out",     icon: "arrow-up-circle-outline" },
  receive:        { label: "Received",      direction: "in",      icon: "arrow-down-circle-outline" },
  fund:           { label: "Funded",        direction: "out",     icon: "lock-closed-outline" },
  withdraw:       { label: "Withdrew",      direction: "in",      icon: "lock-open-outline" },
  stake:          { label: "Staked",        direction: "out",     icon: "trending-up-outline" },
  unstake:        { label: "Unstaked",      direction: "in",      icon: "trending-down-outline" },
  unstake_intent: { label: "Unstaking…",   direction: "neutral", icon: "time-outline" },
  claim_rewards:  { label: "Claimed",       direction: "in",      icon: "gift-outline" },
  lend_deposit:   { label: "Deposited",     direction: "out",     icon: "wallet-outline" },
  lend_withdraw:  { label: "Withdrawn",     direction: "in",      icon: "wallet-outline" },
  dca_create:     { label: "DCA Created",   direction: "out",     icon: "repeat-outline" },
  dca_cancel:     { label: "DCA Cancelled", direction: "neutral", icon: "close-circle-outline" },
};

const DIRECTION_COLOR: Record<Direction, string> = {
  out:     COLORS.negative,
  in:      COLORS.positive,
  neutral: COLORS.textSecondary,
};

// ─── Smart timestamp ──────────────────────────────────────────────────────────

function smartDate(timestamp: number): string {
  const now   = new Date();
  const date  = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (txDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (txDay.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tx: TxRecord;
}

export function TransactionItem({ tx }: Props) {
  const meta      = TX_META[tx.type] ?? { label: tx.type, direction: "neutral" as Direction, icon: "ellipse-outline" };
  const amtColor  = DIRECTION_COLOR[meta.direction];
  const prefix    = meta.direction === "out" ? "−" : meta.direction === "in" ? "+" : "";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.sm,
      }}
    >
      {/* Direction icon */}
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: RADIUS.md,
          backgroundColor: COLORS.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={meta.icon as any} size={18} color={amtColor} />
      </View>

      {/* Left: label + counterparty */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
          <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-Medium", fontSize: 14 }}>
            {meta.label}
          </Text>
          {tx.isPrivate && <PrivacyBadge size="sm" />}
        </View>
        {tx.counterparty ? (
          <Text style={{ color: COLORS.textTertiary, fontFamily: "Inter-Regular", fontSize: 12 }}>
            {shortenAddress(tx.counterparty)}
          </Text>
        ) : null}
      </View>

      {/* Right: amount + timestamp */}
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text style={{ color: amtColor, fontFamily: "Inter-SemiBold", fontSize: 14 }}>
          {prefix}{tx.amount} {tx.token}
        </Text>
        <Text style={{ color: COLORS.textMuted, fontFamily: "Inter-Regular", fontSize: 11 }}>
          {smartDate(tx.timestamp)}
        </Text>
      </View>
    </View>
  );
}
```

---

### AmountInput (`components/AmountInput.tsx`) — Full Rewrite

Adds "Max" button, fiat/token toggle display, and shake animation on invalid input.

```typescript
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
import { formatBalance } from "@/lib/format";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
  /** If provided, renders a "Max" button that fills this value. */
  maxAmount?: string;
  /** Trigger a shake to indicate invalid input. Call via ref or effect. */
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
  const [showFiat, setShowFiat] = useState(false);
  const shakeX = useSharedValue(0);

  // Trigger shake when `invalid` flips to true
  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-8,  { duration: 50 }),
      withTiming( 8,  { duration: 50 }),
      withTiming(-6,  { duration: 50 }),
      withTiming( 6,  { duration: 50 }),
      withTiming( 0,  { duration: 50 }),
    );
  }, [shakeX]);

  // Watch `invalid` changes — shake when it becomes true
  // (Caller should toggle invalid off after a short delay)
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
          style={{
            justifyContent: "center",
            paddingHorizontal: SPACING.sm,
          }}
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingRight: SPACING.sm,
          gap: 4,
        }}
      >
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
```

---

### GroupCard (`components/GroupCard.tsx`) — Full Rewrite

Adds member initials row and directional unsettled badge.

```typescript
// components/GroupCard.tsx
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

// Deterministic color from a string — gives each member a consistent avatar color.
function avatarColor(name: string): string {
  const palette = [
    "#7B5EA7", "#3B82F6", "#10B981", "#F59E0B",
    "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface GroupMemberPreview {
  displayName: string;
}

interface Props {
  name: string;
  members: GroupMemberPreview[];
  /** Positive = they owe you. Negative = you owe them. null = settled. */
  netBalance: number | null;
  currency?: string;
  onPress: () => void;
}

const MAX_AVATARS = 3;

export function GroupCard({ name, members, netBalance, currency = "USD", onPress }: Props) {
  const overflowCount = Math.max(0, members.length - MAX_AVATARS);
  const shownMembers  = members.slice(0, MAX_AVATARS);

  const settled  = netBalance === null || netBalance === 0;
  const youOwe   = !settled && netBalance! < 0;
  const badgeColor  = settled ? COLORS.textMuted : youOwe ? COLORS.negative : COLORS.positive;
  const badgeBg     = settled ? COLORS.surface : youOwe ? COLORS.errorSubtle : COLORS.successSubtle;
  const badgeLabel  = settled
    ? "Settled"
    : youOwe
    ? `You owe $${Math.abs(netBalance!).toFixed(2)}`
    : `You get $${netBalance!.toFixed(2)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      })}
    >
      {/* Left: name + member avatars */}
      <View style={{ gap: SPACING.xs }}>
        <Text style={{
          color: COLORS.textPrimary,
          fontFamily: "Inter-SemiBold",
          fontSize: 15,
        }}>
          {name}
        </Text>

        {/* Avatar row */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {shownMembers.map((m, i) => (
            <View
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: avatarColor(m.displayName),
                alignItems: "center",
                justifyContent: "center",
                marginLeft: i === 0 ? 0 : -6,
                borderWidth: 1.5,
                borderColor: COLORS.background,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter-Bold" }}>
                {initials(m.displayName)}
              </Text>
            </View>
          ))}
          {overflowCount > 0 && (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: COLORS.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: -6,
                borderWidth: 1.5,
                borderColor: COLORS.background,
              }}
            >
              <Text style={{ color: COLORS.textTertiary, fontSize: 8, fontFamily: "Inter-Bold" }}>
                +{overflowCount}
              </Text>
            </View>
          )}
          <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginLeft: 6, fontFamily: "Inter-Regular" }}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Right: balance badge + chevron */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <View style={{
          backgroundColor: badgeBg,
          paddingHorizontal: SPACING.sm,
          paddingVertical: 4,
          borderRadius: RADIUS.full,
        }}>
          <Text style={{ color: badgeColor, fontFamily: "Inter-Medium", fontSize: 12 }}>
            {badgeLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
}
```

---

### AddressDisplay (`components/AddressDisplay.tsx`) — Rewrite

Adds copy animation and optional share action.

```typescript
// components/AddressDisplay.tsx
import { useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

interface Props {
  address: string;
  label?: string;
  /** If true, shows a "Share" button alongside copy. */
  showShare?: boolean;
  /** Number of chars to show at each end. Default: 6 */
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

      {/* Copy button */}
      <Pressable onPress={handleCopy} hitSlop={8}>
        <Ionicons
          name={copied ? "checkmark-circle" : "copy-outline"}
          size={18}
          color={copied ? COLORS.success : COLORS.textTertiary}
        />
      </Pressable>

      {/* Optional share button */}
      {showShare && (
        <Pressable onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={18} color={COLORS.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}
```

---

### QRScanner (`components/QRScanner.tsx`) — NEW

New component using `expo-camera`. Install: `npx expo install expo-camera`.

Add to `app.json` under `expo.plugins`: `"expo-camera"`.

Add to `app.json` under `expo.ios.infoPlist`:
```json
"NSCameraUsageDescription": "SpiceUP uses your camera to scan payment addresses."
```

Add to `app.json` under `expo.android.permissions`: `["CAMERA"]`.

```typescript
// components/QRScanner.tsx
import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { CameraView, Camera } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

export type ScannedAddressType = "starknet" | "tongo" | "unknown";

export interface ScanResult {
  type: ScannedAddressType;
  value: string;
}

interface Props {
  onScan: (result: ScanResult) => void;
  onClose: () => void;
}

function parseAddress(raw: string): ScanResult {
  const trimmed = raw.trim();
  // Starknet addresses: 0x followed by 63–64 hex chars
  if (/^0x[0-9a-fA-F]{63,64}$/.test(trimmed)) {
    return { type: "starknet", value: trimmed };
  }
  // Tongo recipientId: base58 string, typically 44–50 chars (no 0x prefix)
  if (/^[1-9A-HJ-NP-Za-km-z]{40,60}$/.test(trimmed)) {
    return { type: "tongo", value: trimmed };
  }
  return { type: "unknown", value: trimmed };
}

const FRAME_SIZE = Math.min(Dimensions.get("window").width * 0.65, 260);

export function QRScanner({ onScan, onClose }: Props) {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Pulsing border animation on the scan frame
  const borderOpacity = useSharedValue(1);
  useEffect(() => {
    borderOpacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  if (!permission) {
    // Permissions still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textTertiary} />
        <Text style={styles.permissionText}>Camera access is required to scan QR codes.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    const result = parseAddress(data);
    onScan(result);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle}>Scan QR Code</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.cutoutRow}>
          <View style={styles.sideOverlay} />

          {/* Scan frame */}
          <View style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
            {/* Corner markers */}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <View key={corner} style={[styles.corner, styles[corner]]} />
            ))}
            {/* Animated border */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { borderWidth: 2, borderColor: COLORS.accent, borderRadius: RADIUS.md },
                frameStyle,
              ]}
            />
          </View>

          <View style={styles.sideOverlay} />
        </View>

        <View style={styles.bottomOverlay}>
          <Text style={styles.hint}>
            Point at a Starknet address or SpiceUP private address
          </Text>
          {scanned && (
            <Pressable onPress={() => setScanned(false)} style={styles.rescanButton}>
              <Text style={styles.rescanText}>Tap to scan again</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const OVERLAY_BG = "rgba(0,0,0,0.65)";
const CORNER_SIZE = 20;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = COLORS.accent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  topBar: {
    backgroundColor: OVERLAY_BG,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
  },
  topTitle: {
    color: COLORS.textPrimary,
    fontFamily: "Inter-SemiBold",
    fontSize: 17,
  },
  cutoutRow: {
    flexDirection: "row",
    flex: 1,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: OVERLAY_BG,
  },
  bottomOverlay: {
    backgroundColor: OVERLAY_BG,
    alignItems: "center",
    paddingTop: SPACING.xl,
    paddingBottom: 60,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  hint: {
    color: COLORS.textSecondary,
    fontFamily: "Inter-Regular",
    fontSize: 13,
    textAlign: "center",
  },
  rescanButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  rescanText: {
    color: COLORS.textPrimary,
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontFamily: "Inter-Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  permissionButtonText: {
    color: COLORS.textPrimary,
    fontFamily: "Inter-SemiBold",
    fontSize: 15,
  },
  // Corner marker helpers
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
    borderWidth: 0,
  },
  tl: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: RADIUS.sm,
  },
  tr: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: RADIUS.sm,
  },
  bl: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: RADIUS.sm,
  },
  br: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: RADIUS.sm,
  },
});
```

**Usage in `send.tsx`**:
```tsx
{showScanner && (
  <Modal visible presentationStyle="fullScreen" animationType="slide">
    <QRScanner
      onScan={({ type, value }) => {
        setShowScanner(false);
        if (type === "tongo") setRecipientId(value);
        else if (type === "starknet") setToAddress(value);
        else useToast().show("Unrecognised QR code", "error");
      }}
      onClose={() => setShowScanner(false)}
    />
  </Modal>
)}
```

---

## 7.4 Navigation Polish

> PRD 7.1: Root layout, bottom tab navigator, auth guard.

### `app/(app)/_layout.tsx` — Polish

```typescript
// app/(app)/_layout.tsx
import { Tabs } from "expo-router";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TAB_BAR } from "@/constants/ui";

// Animated tab icon wrapper — scales down on press, springs back
function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.82); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 180 }); }}
      hitSlop={6}
    >
      <Animated.View style={style}>
        <Ionicons
          name={focused ? name.replace("-outline", "") as any : name}
          size={24}
          color={color}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: TAB_BAR.backgroundColor,
          borderTopColor:  TAB_BAR.borderTopColor,
          height:          TAB_BAR.height,
          paddingBottom:   8,
        },
        tabBarActiveTintColor:   TAB_BAR.activeTintColor,
        tabBarInactiveTintColor: TAB_BAR.inactiveTintColor,
        tabBarLabelStyle: {
          fontFamily: "Inter-Medium",
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="arrow-up-circle-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="arrow-down-circle-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: "Earn",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trending-up-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings-outline" color={color} focused={focused} />
          ),
        }}
      />

      {/* Hidden modal screens — no tab entry */}
      {[
        "fund", "withdraw",
        "group/[id]", "group/new", "group/add-expense", "join",
        "stake", "unstake", "claim",
        "dca-create", "lend-deposit", "lend-withdraw",
      ].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
```

**Tab hiding for full-screen modal screens** (fund, withdraw, QR scanner).  
In each of those screen files, add this at the top of the component:

```tsx
import { useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// Hide tab bar when this screen is focused
useFocusEffect(
  useCallback(() => {
    navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, []),
);
```

---

## 7.5 Onboarding Screen (Full Redesign)

> PRD 7.4: Slide 1 — "Send money privately". Slide 2 — "No gas fees, ever". Slide 3 — "Sign in with Google — no seed phrases".

Full rewrite of `app/(auth)/onboard.tsx`. Uses a `FlatList` horizontal pager with `useRef` for imperative scrolling (no `ScrollView` paging — better control over dot indicators and "Next" button behavior).

```typescript
// app/(auth)/onboard.tsx
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
  titleAccent: string;  // portion rendered in accent color
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

      {/* Title — split into normal + accent */}
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

      {/* Accent underline decorative bar */}
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
```

---

## 7.6 Home Screen Polish

> PRD 7.1: home.tsx — Balance + recent activity + quick actions.

Full rewrite of `app/(app)/home.tsx` with time-based greeting, 2×2 quick-action grid, empty state, and skeleton loading.

```typescript
// app/(app)/home.tsx
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useBalance } from "@/hooks/useBalance";
import { useConfidentialBalance } from "@/hooks/useConfidentialBalance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { ALL_TOKENS } from "@/constants/tokens";
import { BalanceCard } from "@/components/BalanceCard";
import { ConfidentialBalanceCard } from "@/components/ConfidentialBalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { ActivityIndicator } from "react-native";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";
import { shortenAddress } from "@/lib/format";

// ─── Greeting ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Quick actions ────────────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: string;
  accent?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Send",    icon: "arrow-up-circle-outline",   route: "/(app)/send",    accent: true },
  { label: "Receive", icon: "arrow-down-circle-outline", route: "/(app)/receive" },
  { label: "Fund",    icon: "lock-closed-outline",       route: "/(app)/fund" },
  { label: "Groups",  icon: "people-outline",            route: "/(app)/groups" },
];

function QuickActionButton({ action }: { action: QuickAction }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(action.route as any)}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed
          ? action.accent ? COLORS.accentDim : COLORS.surfaceAlt
          : action.accent ? COLORS.accent : COLORS.surface,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: "center",
        gap: SPACING.xs,
        minWidth: 0,
      })}
    >
      <Ionicons
        name={action.icon}
        size={24}
        color={action.accent ? COLORS.textPrimary : COLORS.accent}
      />
      <Text style={{
        color: COLORS.textPrimary,
        fontFamily: "Inter-Medium",
        fontSize: 13,
      }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { status, error, wallet } = useAuthStore();
  const { balances, confidential, confidentialAvailable, loading } = useWalletStore();
  const { refetch: refetchBalances } = useBalance();
  const { refetch: refetchConfidential, needsRollover, rollover, rollingOver } = useConfidentialBalance();
  const { history, loading: historyLoading } = useTransactionHistory();

  if (status !== "ready") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={{ color: COLORS.textSecondary, fontFamily: "Inter-Regular", fontSize: 14, marginTop: SPACING.lg }}>
          {status === "error" ? error : "Setting up your wallet…"}
        </Text>
      </View>
    );
  }

  const userAddress = wallet?.account?.address ?? "";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingHorizontal: SPACING.pageH, paddingTop: SPACING.pageT, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => { refetchBalances(); refetchConfidential(); }}
          tintColor={COLORS.accent}
        />
      }
    >
      {/* Header */}
      <View style={{ marginBottom: SPACING.xl }}>
        <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-Bold", fontSize: 26 }}>
          {greeting()} 👋
        </Text>
        {userAddress ? (
          <Text style={{ color: COLORS.textTertiary, fontFamily: "Inter-Regular", fontSize: 13, marginTop: 4 }}>
            {shortenAddress(userAddress)}
          </Text>
        ) : null}
      </View>

      {/* Public balances */}
      {ALL_TOKENS.map((token) => (
        <BalanceCard
          key={token.symbol}
          token={token}
          balance={balances[token.symbol as keyof typeof balances]}
          loading={loading}
        />
      ))}

      {/* Confidential balance */}
      <ConfidentialBalanceCard
        state={confidential}
        available={confidentialAvailable}
        needsRollover={needsRollover}
        rollingOver={rollingOver}
        onRollover={rollover}
        onFund={() => router.push("/(app)/fund")}
        onWithdraw={() => router.push("/(app)/withdraw")}
      />

      {/* Quick actions — 2×2 grid */}
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.xl }}>
        {QUICK_ACTIONS.map((a) => (
          <QuickActionButton key={a.label} action={a} />
        ))}
      </View>

      {/* Recent activity */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md }}>
        <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-SemiBold", fontSize: 17 }}>
          Recent Activity
        </Text>
        {history.length > 10 && (
          <Pressable>
            <Text style={{ color: COLORS.accent, fontFamily: "Inter-Medium", fontSize: 13 }}>
              View all
            </Text>
          </Pressable>
        )}
      </View>

      {history.length === 0 && !historyLoading ? (
        <EmptyState
          icon="receipt-outline"
          title="No transactions yet"
          body="Send or receive funds to see your activity here."
        />
      ) : (
        history.slice(0, 10).map((tx) => <TransactionItem key={tx.id} tx={tx} />)
      )}
    </ScrollView>
  );
}
```

---

## 7.7 Toast System

> Replaces scattered `Alert.alert` error calls in Cat 4/5/6 screens with a non-blocking toast.

Three new files: `stores/toast.ts`, `components/Toast.tsx`, `hooks/useToast.ts`.

### `stores/toast.ts`

```typescript
// stores/toast.ts
import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

interface ToastState {
  message: string;
  variant: ToastVariant;
  visible: boolean;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  variant: "info",
  visible: false,
  show: (message, variant = "info") =>
    set({ message, variant, visible: true }),
  hide: () => set({ visible: false }),
}));
```

### `components/Toast.tsx`

```typescript
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

/** Wrap the root Slot with this to enable toasts globally. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <ToastBanner />
    </View>
  );
}
```

### `hooks/useToast.ts`

```typescript
// hooks/useToast.ts
import { useToastStore, type ToastVariant } from "@/stores/toast";

export function useToast() {
  const show = useToastStore((s) => s.show);
  return {
    show: (message: string, variant?: ToastVariant) => show(message, variant),
    success: (message: string) => show(message, "success"),
    error:   (message: string) => show(message, "error"),
    info:    (message: string) => show(message, "info"),
  };
}
```

### Migration: Replace `Alert.alert` in Cat 4/5/6 Screens

In every catch block across `send.tsx`, `fund.tsx`, `withdraw.tsx`, `stake.tsx`, `dca-create.tsx`, `lend-deposit.tsx`, `lend-withdraw.tsx`, `group/add-expense.tsx`, and `group/[id].tsx`:

```tsx
// Before (Cat 4/5/6 pattern):
} catch (e: any) {
  Alert.alert("Error", e.message ?? "Transaction failed");
}

// After:
import { useToast } from "@/hooks/useToast";
const toast = useToast();
// ...
} catch (e: any) {
  toast.error(e.message ?? "Transaction failed");
}
```

---

## 7.8 Empty State Component

> Used in: home (no transactions), groups list (no groups), earn (no positions).

```typescript
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
```

### EmptyState Usage Examples

```tsx
// groups.tsx — no groups yet
<EmptyState
  icon="people-outline"
  title="No groups yet"
  body="Create a group to start splitting expenses with friends."
  action={{ label: "New Group", onPress: () => router.push("/(app)/group/new") }}
/>

// earn.tsx — no staking positions
<EmptyState
  icon="trending-up-outline"
  title="No active positions"
  body="Stake STRK, set up a DCA order, or deposit to a lending pool to start earning."
/>

// home.tsx — no transactions
<EmptyState
  icon="receipt-outline"
  title="No transactions yet"
  body="Send or receive funds to see your activity here."
/>
```

---

## File Summary

| Status | Path | Description |
|--------|------|-------------|
| NEW | `assets/fonts/Inter-Regular.ttf` | Font asset |
| NEW | `assets/fonts/Inter-Medium.ttf` | Font asset |
| NEW | `assets/fonts/Inter-SemiBold.ttf` | Font asset |
| NEW | `assets/fonts/Inter-Bold.ttf` | Font asset |
| NEW | `constants/ui.ts` | Design tokens (colors, spacing, radius, shadows) |
| NEW | `components/Skeleton.tsx` | Shimmer skeleton loader |
| NEW | `components/PrivacyBadge.tsx` | Extracted private-tx badge |
| NEW | `components/QRScanner.tsx` | Camera QR scanner with permission flow |
| NEW | `components/EmptyState.tsx` | Empty state with icon, title, body, CTA |
| NEW | `components/Toast.tsx` + `ToastProvider` | Animated top-of-screen toast |
| NEW | `stores/toast.ts` | Zustand toast state |
| NEW | `hooks/useToast.ts` | Toast hook (`toast.success/error/info`) |
| REWRITE | `app/_layout.tsx` | Add font loading + `SplashScreen` gate + `ToastProvider` |
| REWRITE | `app/(app)/_layout.tsx` | Animated tab icons, `tabBarHideOnKeyboard`, polish |
| REWRITE | `app/(auth)/onboard.tsx` | FlatList pager, dots, Skip, animated CTA |
| REWRITE | `app/(app)/home.tsx` | Greeting, 2×2 quick grid, EmptyState, skeleton |
| REWRITE | `components/BalanceCard.tsx` | Hide toggle, fiat/token toggle, skeleton, press handler |
| REWRITE | `components/TransactionItem.tsx` | Labels, icons, smart timestamp, PrivacyBadge |
| REWRITE | `components/AmountInput.tsx` | Max button, shake animation, cleaned token pills |
| REWRITE | `components/GroupCard.tsx` | Initials row, directional balance badge, chevron |
| REWRITE | `components/AddressDisplay.tsx` | Copy animation, optional share |
| MODIFY | `tailwind.config.js` | Add `fontFamily` entries for Inter weights |
| MODIFY | all Cat 4/5/6 screens with `Alert.alert` | Replace with `useToast().error(...)` |

---

## Verification

1. **Fonts visible**: Run `npx expo start --clear`. In the app, all text should display in Inter (not the system font). Check boldness on section headings.
2. **Skeleton loaders**: On a slow network emulation or cold start, `BalanceCard` should briefly show shimmer boxes before balances resolve.
3. **Onboarding**: From a logged-out state, navigate to `/onboard`. Swipe through all three slides — dots animate, "Next" advances, "Get Started" on slide 3 navigates to login. "Skip" at any point also goes to login.
4. **Toast**: In `send.tsx`, intentionally enter an invalid Tongo address and submit. The red toast should slide in from the top and auto-dismiss after 3 seconds.
5. **QR Scanner**: On a device/simulator with camera, tap the QR icon in `send.tsx`. Permission dialog should appear. After granting, the scan frame corners and pulsing border should be visible. Point at a Starknet address QR — the `onScan` callback fires and populates the address field.
6. **PrivacyBadge**: Any transaction with `isPrivate: true` in history should show the purple "Private" badge with lock icon in `TransactionItem`.
7. **Tab bar**: On iOS keyboard-up (amount input screens), the tab bar should be hidden (`tabBarHideOnKeyboard: true`). On returning to a tab, it re-appears.
8. **Empty state**: Sign in with a fresh wallet (no history). Home should show `EmptyState` with receipt icon instead of an empty list.
9. **GroupCard avatars**: Open an existing group. Member initials should appear as coloured circles, overlapping, with "+N" if more than 3 members. Balance badge should be red if you owe, green if owed.
