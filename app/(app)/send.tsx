import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { Amount } from "starkzap";
import type { Token, Address } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { AmountInput } from "@/components/AmountInput";
import { ETH } from "@/constants/tokens";

type Stage = "input" | "reviewing" | "sending" | "done";

export default function Send() {
  const onboard = useAuthStore((s) => s.wallet);
  const [recipient, setRecipient] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!onboard || !recipient || !amountStr) return;
    setStage("reviewing");
    try {
      const amount = Amount.parse(amountStr, token);
      const result = await onboard.wallet
        .tx()
        .transfer(token, { to: recipient as Address, amount })
        .preflight();
      if (!result.ok) {
        Alert.alert("Transaction would fail", result.reason ?? "Unknown error");
        setStage("input");
        return;
      }
      // Preflight passed — stay in reviewing stage for user to confirm
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
      setStage("input");
    }
  }

  async function send() {
    if (!onboard || !recipient || !amountStr) return;
    setStage("sending");
    try {
      const amount = Amount.parse(amountStr, token);
      const tx = await onboard.wallet
        .tx()
        .transfer(token, { to: recipient as Address, amount })
        .send();
      setTxHash(tx.hash);
      setExplorerUrl(tx.explorerUrl);
      await tx.wait();

      await recordTx({
        id: tx.hash,
        type: "send",
        amount: amountStr,
        token: token.symbol,
        counterparty: recipient,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: false,
      });

      setStage("done");
    } catch (e: any) {
      Alert.alert("Transaction failed", e.message ?? String(e));
      setStage("input");
    }
  }

  function reset() {
    setRecipient("");
    setAmountStr("");
    setTxHash("");
    setExplorerUrl("");
    setStage("input");
  }

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-2xl font-bold mb-4">Sent!</Text>
        <Text className="text-neutral-400 text-sm mb-2">
          {amountStr} {token.symbol} to {recipient.slice(0, 10)}...
        </Text>
        <Text className="text-neutral-500 text-xs mb-8" numberOfLines={1}>
          {explorerUrl}
        </Text>
        <Pressable onPress={reset} className="bg-accent p-4 rounded-xl w-full">
          <Text className="text-white text-center font-semibold">Send another</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">Send</Text>

      <Text className="text-neutral-400 text-sm mb-2">Recipient address</Text>
      <TextInput
        value={recipient}
        onChangeText={setRecipient}
        placeholder="0x..."
        placeholderTextColor="#666"
        className="bg-neutral-900 text-white p-4 rounded-xl mb-4"
        autoCapitalize="none"
        editable={stage === "input"}
      />

      <Text className="text-neutral-400 text-sm mb-2">Amount</Text>
      <AmountInput
        value={amountStr}
        onChangeText={setAmountStr}
        selectedToken={token}
        onSelectToken={setToken}
      />

      <View className="mt-8">
        {stage === "input" && (
          <Pressable
            onPress={review}
            className="bg-accent p-4 rounded-xl"
            disabled={!recipient || !amountStr}
          >
            <Text className="text-white text-center font-semibold">Review</Text>
          </Pressable>
        )}

        {stage === "reviewing" && (
          <View>
            <View className="bg-neutral-900 p-4 rounded-xl mb-3">
              <Text className="text-green-400 text-sm mb-1">Preflight passed</Text>
              <Text className="text-white">
                Send {amountStr} {token.symbol} to {recipient.slice(0, 10)}...
              </Text>
            </View>
            <Pressable onPress={send} className="bg-green-700 p-4 rounded-xl mb-2">
              <Text className="text-white text-center font-semibold">Confirm & Send</Text>
            </Pressable>
            <Pressable onPress={() => setStage("input")} className="p-3">
              <Text className="text-neutral-400 text-center">Cancel</Text>
            </Pressable>
          </View>
        )}

        {stage === "sending" && (
          <View className="items-center py-4">
            <ActivityIndicator color="#7B5EA7" />
            <Text className="text-neutral-400 mt-2">Sending transaction...</Text>
          </View>
        )}
      </View>
    </View>
  );
}
