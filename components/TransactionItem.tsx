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
  rollover:       { label: "Rolled Over",   direction: "neutral", icon: "refresh-outline" },
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
  const now       = new Date();
  const date      = new Date(timestamp);
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const txDay     = new Date(date.getFullYear(), date.getMonth(), date.getDate());

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
  const meta     = TX_META[tx.type] ?? { label: tx.type, direction: "neutral" as Direction, icon: "ellipse-outline" };
  const amtColor = DIRECTION_COLOR[meta.direction];
  const prefix   = meta.direction === "out" ? "−" : meta.direction === "in" ? "+" : "";

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
