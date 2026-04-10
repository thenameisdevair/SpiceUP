import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { useStaking } from "@/hooks/useStaking";
import { useDCA } from "@/hooks/useDCA";
import { useLending } from "@/hooks/useLending";
import { PoolCard } from "@/components/PoolCard";
import { DcaOrderCard } from "@/components/DcaOrderCard";
import { LendingMarketCard } from "@/components/LendingMarketCard";
import { EarnSummaryCard } from "@/components/EarnSummaryCard";
import { cancelDcaOrder } from "@/lib/dca";

type EarnTab = "staking" | "dca" | "lending";

function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center py-10">
      <Text className="text-neutral-500 text-sm">{text}</Text>
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="bg-red-900/40 border border-red-800 rounded-xl p-3 mx-4 mb-3">
      <Text className="text-red-400 text-sm">{message}</Text>
    </View>
  );
}

export default function Earn() {
  const router = useRouter();
  const { status } = useAuthStore();
  const onboard = useAuthStore((s) => s.wallet);
  const {
    pools, stakedPositions, poolsLoading, poolsError,
    dcaOrders, dcaLoading, dcaError,
    lendingMarkets, lendingPositions, lendingLoading,
  } = useEarnStore();

  useStaking();
  useDCA();
  useLending();

  const [activeTab, setActiveTab] = useState<EarnTab>("staking");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (status !== "ready") {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator color="#7B5EA7" />
      </View>
    );
  }

  async function handleCancelDca(orderId: string, orderAddress: string) {
    if (!onboard) return;
    setCancellingId(orderId);
    try {
      await cancelDcaOrder(onboard, orderId, orderAddress as any);
    } catch {
      // silently ignore — order list will refresh on next poll
    } finally {
      setCancellingId(null);
    }
  }

  const tabs: { key: EarnTab; label: string }[] = [
    { key: "staking", label: "Staking" },
    { key: "dca",     label: "DCA" },
    { key: "lending", label: "Lending" },
  ];

  return (
    <View className="flex-1 bg-background pt-16">
      {/* Summary */}
      <EarnSummaryCard
        stakedPositions={stakedPositions}
        lendingPositions={lendingPositions}
      />

      {/* Tab toggle */}
      <View className="flex-row bg-neutral-900 rounded-xl mx-4 mb-4 p-1">
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg ${activeTab === tab.key ? "bg-neutral-700" : ""}`}
          >
            <Text
              className={`text-center text-sm font-medium ${
                activeTab === tab.key ? "text-white" : "text-neutral-400"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Staking tab */}
      {activeTab === "staking" && (
        <ScrollView contentContainerClassName="px-4 pb-8">
          {poolsError && <ErrorBanner message={poolsError} />}
          {poolsLoading && pools.length === 0 && (
            <ActivityIndicator color="#7B5EA7" className="py-8" />
          )}
          {pools.map((pool) => (
            <PoolCard
              key={pool.poolContract}
              pool={pool}
              position={
                stakedPositions.find((p) => p.poolContract === pool.poolContract) ?? null
              }
              onStake={() =>
                router.push({
                  pathname: "/(app)/stake",
                  params: { poolAddress: pool.poolContract },
                })
              }
              onClaim={() =>
                router.push({
                  pathname: "/(app)/claim",
                  params: { poolAddress: pool.poolContract },
                })
              }
              onUnstake={() =>
                router.push({
                  pathname: "/(app)/unstake",
                  params: { poolAddress: pool.poolContract },
                })
              }
            />
          ))}
          {pools.length === 0 && !poolsLoading && (
            <EmptyState text="No staking pools available" />
          )}
        </ScrollView>
      )}

      {/* DCA tab */}
      {activeTab === "dca" && (
        <ScrollView contentContainerClassName="px-4 pb-8">
          {dcaError && <ErrorBanner message={dcaError} />}
          {dcaLoading && dcaOrders.length === 0 && (
            <ActivityIndicator color="#7B5EA7" className="py-8" />
          )}
          {dcaOrders.map((order) => (
            <DcaOrderCard
              key={order.id}
              order={order}
              onCancel={() => handleCancelDca(order.id, order.orderAddress)}
              cancelling={cancellingId === order.id}
            />
          ))}
          {dcaOrders.length === 0 && !dcaLoading && (
            <EmptyState text="No active DCA orders" />
          )}
          <Pressable
            onPress={() => router.push("/(app)/dca-create")}
            className="bg-purple-700 p-4 rounded-xl mt-2"
          >
            <Text className="text-white text-center font-semibold">+ New DCA Order</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Lending tab */}
      {activeTab === "lending" && (
        <ScrollView contentContainerClassName="px-4 pb-8">
          {lendingLoading && lendingMarkets.length === 0 && (
            <ActivityIndicator color="#7B5EA7" className="py-8" />
          )}
          {lendingMarkets.length === 0 && !lendingLoading && (
            <EmptyState text="Lending not available on testnet" />
          )}
          {lendingMarkets.map((market) => (
            <LendingMarketCard
              key={market.id}
              market={market}
              position={lendingPositions.find((p) => p.poolId === market.id) ?? null}
              onDeposit={() =>
                router.push({
                  pathname: "/(app)/lend-deposit",
                  params: { poolId: market.id },
                })
              }
              onWithdraw={() =>
                router.push({
                  pathname: "/(app)/lend-withdraw",
                  params: { poolId: market.id },
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
