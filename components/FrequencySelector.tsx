import { View, Text, Pressable, ScrollView } from "react-native";
import type { DcaFrequencyOption } from "@/lib/earn";

interface Props {
  options: DcaFrequencyOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export function FrequencySelector({ options, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
      <View className="flex-row gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            className={`px-4 py-2 rounded-xl ${
              selected === opt.value ? "bg-purple-700" : "bg-neutral-800"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selected === opt.value ? "text-white" : "text-neutral-400"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
