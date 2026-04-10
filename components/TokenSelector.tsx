import { View, Pressable, Text } from "react-native";
import type { Token } from "starkzap";
import { ALL_TOKENS } from "@/constants/tokens";

interface Props {
  selected: Token;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ selected, onSelect }: Props) {
  return (
    <View className="flex-row">
      {ALL_TOKENS.map((token) => (
        <Pressable
          key={token.symbol}
          onPress={() => onSelect(token)}
          className={`flex-1 p-3 rounded-xl mx-1 ${
            selected.symbol === token.symbol ? "bg-accent" : "bg-neutral-900"
          }`}
        >
          <Text className={`text-center font-medium ${
            selected.symbol === token.symbol ? "text-white" : "text-neutral-400"
          }`}>
            {token.symbol}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
