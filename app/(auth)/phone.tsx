// Simple local-only phone capture. SMS OTP + Supabase resolver is deferred to Cat 5.
import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { secureSet } from "@/lib/secure";

export default function Phone() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  async function save() {
    if (phone.length < 6) return;
    await secureSet("phoneNumber", phone);
    router.replace("/(app)/home");
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-white text-2xl font-bold mb-2">Your phone number</Text>
      <Text className="text-neutral-400 mb-8">
        Friends use your phone number to find you.
      </Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="+1 555 555 5555"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        className="bg-neutral-900 text-white p-4 rounded-xl mb-4"
      />
      <Pressable onPress={save} className="bg-accent p-4 rounded-xl">
        <Text className="text-white text-center font-semibold">Continue</Text>
      </Pressable>
    </View>
  );
}
