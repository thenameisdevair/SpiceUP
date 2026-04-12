import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
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
  const { status, error, starknetAddress } = useAuthStore();
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

  const userAddress = starknetAddress ?? "";

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
