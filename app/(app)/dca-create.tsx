import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import type { Token } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { AmountInput } from "@/components/AmountInput";
import { TokenSelector } from "@/components/TokenSelector";
import { FrequencySelector } from "@/components/FrequencySelector";
import { createDcaOrder, DCA_FREQUENCY_OPTIONS } from "@/lib/dca";
import { ALL_TOKENS, STRK, ETH } from "@/constants/tokens";

type Stage = "input" | "reviewing" | "creating" | "done";

export default function DcaCreate() {
  const router = useRouter();
  const onboard = useAuthStore((s) => s.wallet);
  const { recordTx } = useTransactionHistory();

  const [sellToken, setSellToken] = useState<Token>(STRK);
  const [buyToken, setBuyToken] = useState<Token>(ETH);
  const [totalAmount, setTotalAmount] = useState("");
  const [perCycleAmount, setPerCycleAmount] = useState("");
  const [frequency, setFrequency] = useState(DCA_FREQUENCY_OPTIONS[1].value); // Daily default
  const [stage, setStage] = useState<Stage>("input");

  const buyTokenOptions = ALL_TOKENS.filter((t) => t.symbol !== sellToken.symbol);

  const estimatedCycles =
    totalAmount && perCycleAmount && parseFloat(perCycleAmount) > 0
      ? Math.floor(parseFloat(totalAmount) / parseFloat(perCycleAmount))
      : null;

  const freqLabel = DCA_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? frequency;

  function validate(): string | null {
    if (!totalAmount || !perCycleAmount) return "Enter amounts";
    if (parseFloat(perCycleAmount) <= 0) return "Per-cycle amount must be > 0";
    if (parseFloat(perCycleAmount) > parseFloat(totalAmount)) return "Per-cycle must be \u2264 total budget";
    if (sellToken.symbol === buyToken.symbol) return "Sell and buy tokens must differ";
    return null;
  }

  async function review() {
    const err = validate();
    if (err) { Alert.alert("Invalid input", err); return; }
    if (!onboard) return;
    setStage("reviewing");
    try {
      const { Amount } = await import("starkzap");
      const result = await onboard.wallet.tx().dcaCreate({
        sellToken,
        buyToken,
        sellAmount:         Amount.parse(totalAmount,    sellToken),
        sellAmountPerCycle: Amount.parse(perCycleAmount, sellToken),
        frequency,
      }).preflight();
      if (!result.ok) {
        Alert.alert("Transaction would fail", result.reason ?? "Unknown error");
        setStage("input");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
      setStage("input");
    }
  }

  async function confirm() {
    if (!onboard) return;
    setStage("creating");
    try {
      const tx = await createDcaOrder(onboard, {
        sellToken,
        buyToken,
        totalSellAmount: totalAmount,
        perCycleSellAmount: perCycleAmount,
        frequency,
      });
      await tx.wait();
      await recordTx({
        id: tx.hash,
        type: "dca_create",
        amount: totalAmount,
        token: sellToken.symbol,
        counterparty: "dca",
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

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-5xl mb-4">✓</Text>
        <Text className="text-white text-xl font-bold mb-2">DCA Order Created</Text>
        <Text className="text-neutral-400 text-sm text-center mb-8">
          Your {perCycleAmount} {sellToken.symbol}/{freqLabel.toLowerCase()} buy order is now active
        </Text>
        <Pressable
          onPress={() => router.replace("/(app)/earn")}
          className="bg-accent p-4 rounded-xl w-full"
        >
          <Text className="text-white text-center font-semibold">Back to Earn</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pt-16 pb-10">
      <Pressable onPress={() => router.back()} className="mb-6">
        <Text className="text-neutral-400 text-sm">\u2190 Back</Text>
      </Pressable>
      <Text className="text-white text-2xl font-bold mb-6">New DCA Order</Text>

      {stage === "input" && (
        <View>
          <Text className="text-neutral-400 text-sm mb-2">Sell token</Text>
          <TokenSelector
            tokens={ALL_TOKENS}
            selected={sellToken}
            onSelect={(t) => { setSellToken(t); if (buyToken.symbol === t.symbol) setBuyToken(ALL_TOKENS.find((x) => x.symbol !== t.symbol)!); }}
          />

          <Text className="text-neutral-400 text-sm mt-4 mb-2">Buy token</Text>
          <TokenSelector
            tokens={buyTokenOptions}
            selected={buyToken}
            onSelect={setBuyToken}
          />

          <Text className="text-neutral-400 text-sm mt-4 mb-2">Total budget</Text>
          <AmountInput
            value={totalAmount}
            onChangeText={setTotalAmount}
            selectedToken={sellToken}
            onSelectToken={() => {}}
          />

          <Text className="text-neutral-400 text-sm mt-4 mb-2">Per cycle</Text>
          <AmountInput
            value={perCycleAmount}
            onChangeText={setPerCycleAmount}
            selectedToken={sellToken}
            onSelectToken={() => {}}
          />

          <Text className="text-neutral-400 text-sm mt-4 mb-2">Frequency</Text>
          <FrequencySelector
            options={DCA_FREQUENCY_OPTIONS}
            selected={frequency}
            onSelect={setFrequency}
          />

          <Pressable
            onPress={review}
            className="bg-accent p-4 rounded-xl mt-8"
          >
            <Text className="text-white text-center font-semibold">Review Order</Text>
          </Pressable>
        </View>
      )}

      {stage === "reviewing" && (
        <View>
          <View className="bg-neutral-900 p-4 rounded-xl mb-3">
            <Text className="text-purple-400 text-sm mb-2">Preflight passed</Text>
            <Text className="text-white text-base font-semibold mb-1">
              Buy {buyToken.symbol} with {sellToken.symbol}
            </Text>
            <Text className="text-neutral-400 text-sm">
              {perCycleAmount} {sellToken.symbol} {freqLabel.toLowerCase()}
            </Text>
            <Text className="text-neutral-400 text-sm">
              Total budget: {totalAmount} {sellToken.symbol}
              {estimatedCycles ? ` \u2192 ~${estimatedCycles} cycles` : ""}
            </Text>
          </View>
          <Pressable onPress={confirm} className="bg-purple-700 p-4 rounded-xl mb-2">
            <Text className="text-white text-center font-semibold">Confirm &amp; Create</Text>
          </Pressable>
          <Pressable onPress={() => setStage("input")} className="p-3">
            <Text className="text-neutral-400 text-center">\u2190 Back</Text>
          </Pressable>
        </View>
      )}

      {stage === "creating" && (
        <View className="items-center py-4">
          <ActivityIndicator color="#7B5EA7" />
          <Text className="text-neutral-400 mt-2">Creating DCA order...</Text>
        </View>
      )}
    </ScrollView>
  );
}
