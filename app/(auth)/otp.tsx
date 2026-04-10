import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLoginWithEmail } from "@privy-io/expo";

export default function Otp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const { loginWithCode, state } = useLoginWithEmail();

  async function verify() {
    const user = await loginWithCode({ code, email });
    if (user) router.replace("/(auth)/phone");
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-white text-2xl font-bold mb-4">Enter the code</Text>
      <Text className="text-neutral-400 mb-8">Sent to {email}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="6-digit code"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        maxLength={6}
        className="bg-neutral-900 text-white p-4 rounded-xl mb-4 text-center text-xl tracking-widest"
      />
      <Pressable onPress={verify} className="bg-accent p-4 rounded-xl">
        <Text className="text-white text-center font-semibold">
          {state.status === "submitting-code" ? "Verifying\u2026" : "Verify"}
        </Text>
      </Pressable>
    </View>
  );
}
