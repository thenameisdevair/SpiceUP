import { View, Text } from "react-native";
import type { Amount, Token } from "starkzap";
import { formatBalance, toFiat } from "@/lib/format";

interface Props {
  token: Token;
  balance: Amount | null;
}

export function BalanceCard({ token, balance }: Props) {
  return (
    <View className="bg-neutral-900 p-4 rounded-xl mb-3 flex-row items-center justify-between">
      <View>
        <Text className="text-white font-semibold text-base">{token.symbol}</Text>
        <Text className="text-neutral-400 text-xs">{token.name}</Text>
      </View>
      <View className="items-end">
        <Text className="text-white text-base font-medium">
          {formatBalance(balance)}
        </Text>
        <Text className="text-neutral-500 text-xs">
          {toFiat(balance, token.symbol)}
        </Text>
      </View>
    </View>
  );
}
