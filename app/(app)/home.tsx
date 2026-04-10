import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useBalance } from "@/hooks/useBalance";
import { useConfidentialBalance } from "@/hooks/useConfidentialBalance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { ALL_TOKENS } from "@/constants/tokens";
import { BalanceCard } from "@/components/BalanceCard";
import { ConfidentialBalanceCard } from "@/components/ConfidentialBalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import { ActivityIndicator } from "react-native";

export default function Home() {
  const router = useRouter();
  const { status, error } = useAuthStore();
  const { balances, confidential, confidentialAvailable, loading } = useWalletStore();
  const { refetch: refetchBalances } = useBalance();
  const { refetch: refetchConfidential, needsRollover, rollover, rollingOver } = useConfidentialBalance();
  const { history } = useTransactionHistory();

  if (status !== "ready") {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator color="#7B5EA7" />
        <Text className="text-neutral-400 mt-4">
          {status === "error" ? error : "Setting up your wallet..."}
        </Text>
      </View>
    );
  }

  function onRefresh() {
    refetchBalances();
    refetchConfidential();
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-6 pt-16 pb-8"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#7B5EA7" />
      }
    >
      <Text className="text-white text-2xl font-bold mb-6">SpiceUP</Text>

      {/* Public balances */}
      {ALL_TOKENS.map((token) => (
        <BalanceCard
          key={token.symbol}
          token={token}
          balance={balances[token.symbol as keyof typeof balances]}
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

      {/* Quick actions */}
      <View className="flex-row mt-4 mb-6">
        <Pressable
          onPress={() => router.push("/(app)/send")}
          className="flex-1 bg-accent p-4 rounded-xl mr-2"
        >
          <Text className="text-white text-center font-semibold">Send</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(app)/receive")}
          className="flex-1 bg-neutral-800 p-4 rounded-xl ml-2"
        >
          <Text className="text-white text-center font-semibold">Receive</Text>
        </Pressable>
      </View>

      {/* Recent transactions */}
      <Text className="text-white text-lg font-semibold mb-3">Recent Activity</Text>
      {history.length === 0 ? (
        <Text className="text-neutral-500 text-sm">No transactions yet</Text>
      ) : (
        history.slice(0, 10).map((tx) => <TransactionItem key={tx.id} tx={tx} />)
      )}
    </ScrollView>
  );
}
