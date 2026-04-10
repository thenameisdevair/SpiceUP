import { View, Text, Pressable, ActivityIndicator } from "react-native";
import type { AppDcaOrder } from "@/lib/earn";

interface Props {
  order: AppDcaOrder;
  onCancel: () => void;
  cancelling: boolean;
}

export function DcaOrderCard({ order, onCancel, cancelling }: Props) {
  const statusBg =
    order.status === "ACTIVE"   ? "bg-green-900/40"  :
    order.status === "INDEXING" ? "bg-yellow-900/40" :
    "bg-neutral-800";
  const statusText =
    order.status === "ACTIVE"   ? "text-green-400"  :
    order.status === "INDEXING" ? "text-yellow-400" :
    "text-neutral-400";

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-3">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white text-base font-semibold">
          {order.sellToken.symbol} → {order.buyToken.symbol}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-neutral-400 text-sm">{order.frequencyLabel}</Text>
          <View className={`px-2 py-0.5 rounded ${statusBg}`}>
            <Text className={`text-xs font-medium ${statusText}`}>{order.status}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <Text className="text-neutral-400 text-sm mb-1">
        {order.sellAmountPerCycle} {order.sellToken.symbol} per cycle
        {"  "}Executed: {order.executedTradesCount} trades
      </Text>
      <Text className="text-neutral-500 text-xs mb-3">
        Sold: {order.amountSold} {order.sellToken.symbol}
        {"  /  "}
        Bought: {order.amountBought} {order.buyToken.symbol}
      </Text>

      {/* Cancel */}
      <Pressable
        onPress={onCancel}
        disabled={cancelling}
        className="bg-neutral-800 py-2.5 rounded-xl items-center"
      >
        {cancelling ? (
          <ActivityIndicator color="#7B5EA7" size="small" />
        ) : (
          <Text className="text-red-400 text-sm font-semibold">Cancel Order</Text>
        )}
      </Pressable>
    </View>
  );
}
