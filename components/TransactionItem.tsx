import { View, Text } from "react-native";
import type { TxRecord } from "@/lib/txHistory";
import { shortenAddress } from "@/lib/format";

interface Props {
  tx: TxRecord;
}

export function TransactionItem({ tx }: Props) {
  const isSend = tx.type === "send" || tx.type === "fund";
  const sign = isSend ? "-" : "+";
  const color = isSend ? "text-red-400" : "text-green-400";

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-neutral-800">
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-white text-sm font-medium capitalize">{tx.type}</Text>
          {tx.isPrivate && (
            <View className="bg-purple-900/60 px-1.5 py-0.5 rounded ml-2">
              <Text className="text-purple-300 text-[10px]">Private</Text>
            </View>
          )}
        </View>
        <Text className="text-neutral-500 text-xs mt-0.5">
          {shortenAddress(tx.counterparty)}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`${color} text-sm font-medium`}>
          {sign}{tx.amount} {tx.token}
        </Text>
        <Text className="text-neutral-600 text-xs">
          {new Date(tx.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}
