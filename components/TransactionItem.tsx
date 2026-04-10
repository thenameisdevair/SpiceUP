import { View, Text } from "react-native";
import type { TxRecord } from "@/lib/txHistory";
import { shortenAddress } from "@/lib/format";

interface Props {
  tx: TxRecord;
}

export function TransactionItem({ tx }: Props) {
  const outbound = ["send", "fund", "stake", "lend_deposit", "dca_create"].includes(tx.type);
  const inbound  = ["receive", "withdraw", "unstake", "lend_withdraw", "claim_rewards"].includes(tx.type);
  const pending  = ["unstake_intent", "dca_cancel"].includes(tx.type);
  const sign  = outbound ? "\u2212" : inbound ? "+" : "\u27F3";
  const color = outbound ? "text-red-400" : inbound ? "text-green-400" : "text-neutral-400";

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
