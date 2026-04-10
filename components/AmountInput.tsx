import { View, TextInput, Pressable, Text } from "react-native";
import type { Token } from "starkzap";
import { ALL_TOKENS } from "@/constants/tokens";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
}

export function AmountInput({ value, onChangeText, selectedToken, onSelectToken }: Props) {
  return (
    <View className="flex-row bg-neutral-900 rounded-xl overflow-hidden">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor="#666"
        keyboardType="decimal-pad"
        className="flex-1 text-white text-xl p-4"
      />
      <View className="flex-row items-center pr-2">
        {ALL_TOKENS.map((token) => (
          <Pressable
            key={token.symbol}
            onPress={() => onSelectToken(token)}
            className={`px-3 py-2 rounded-lg mx-0.5 ${
              selectedToken.symbol === token.symbol ? "bg-accent" : "bg-neutral-800"
            }`}
          >
            <Text className={`text-sm font-medium ${
              selectedToken.symbol === token.symbol ? "text-white" : "text-neutral-400"
            }`}>
              {token.symbol}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
