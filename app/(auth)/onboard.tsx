// Minimal 3-slide explainer. Not polished — Cat 7 will redesign.
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const slides = [
  { title: "Send money privately", body: "Amounts are hidden on-chain via ZK proofs." },
  { title: "No gas fees, ever", body: "We cover the chain costs for you." },
  { title: "No seed phrases", body: "Sign in with Google or email. That's it." },
];

export default function Onboard() {
  const router = useRouter();
  const { width } = Dimensions.get("window");
  return (
    <View className="flex-1 bg-background">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {slides.map((s, i) => (
          <View key={i} style={{ width }} className="justify-center items-center px-8">
            <Text className="text-white text-3xl font-bold mb-4 text-center">{s.title}</Text>
            <Text className="text-neutral-400 text-center">{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        className="bg-accent mx-6 mb-12 p-4 rounded-xl"
      >
        <Text className="text-white text-center font-semibold">Get Started</Text>
      </Pressable>
    </View>
  );
}
