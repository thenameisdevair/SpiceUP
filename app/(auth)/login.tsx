import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useLoginWithEmail, useLoginWithOAuth } from "@privy-io/expo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const emailFlow = useLoginWithEmail();
  const { login: oauthLogin, state: oauthState } = useLoginWithOAuth();

  async function sendOtp() {
    await emailFlow.sendCode({ email });
    router.push({ pathname: "/(auth)/otp", params: { email } });
  }

  async function googleLogin() {
    await oauthLogin({ provider: "google" });
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-10">Welcome to SpiceUP</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        className="bg-neutral-900 text-white p-4 rounded-xl mb-3"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable onPress={sendOtp} className="bg-accent p-4 rounded-xl mb-4">
        <Text className="text-white text-center font-semibold">Continue with Email</Text>
      </Pressable>

      <Pressable onPress={googleLogin} className="bg-white p-4 rounded-xl">
        <Text className="text-black text-center font-semibold">
          {oauthState.status === "loading" ? "Connecting..." : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}
