import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { addExpense } from "@/lib/groups";
import { cacheExpenses, getCachedExpenses } from "@/lib/groupsCache";
import { AmountInput } from "@/components/AmountInput";
import { ETH } from "@/constants/tokens";
import type { ExpenseSplit, GroupMember } from "@/lib/groups";
import type { Token } from "starkzap";

type Stage = "input" | "reviewing" | "saving" | "done";
type SplitMode = "equal" | "custom";

function calcEqualSplits(
  totalStr: string,
  members: GroupMember[]
): ExpenseSplit[] {
  const total = parseFloat(totalStr);
  if (isNaN(total) || total <= 0 || members.length === 0) return [];
  const base = Math.floor((total / members.length) * 100) / 100;
  const remainder = parseFloat((total - base * members.length).toFixed(2));
  return members.map((m, i) => ({
    userId: m.userId,
    amount:
      i === 0
        ? String(+(base + remainder).toFixed(2))
        : String(base),
  }));
}

export default function AddExpense() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { privyUserId } = useAuthStore();
  const group = useGroupsStore((s) => s.groups.find((g) => g.id === groupId));

  const [stage, setStage] = useState<Stage>("input");
  const [payer, setPayer] = useState<string>(privyUserId ?? "");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [customSplits, setCustomSplits] = useState<ExpenseSplit[]>([]);

  const members = group?.members ?? [];

  // Recompute custom splits when members change
  useEffect(() => {
    if (members.length > 0) {
      setCustomSplits(members.map((m) => ({ userId: m.userId, amount: "" })));
    }
  }, [group?.id]);

  if (!group) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-400">Group not found</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const equalSplits = calcEqualSplits(amount, members);
  const splits = splitMode === "equal" ? equalSplits : customSplits;

  const customTotal = customSplits.reduce(
    (s, x) => s + (parseFloat(x.amount) || 0),
    0
  );
  const parsedAmount = parseFloat(amount) || 0;
  const splitsValid =
    splitMode === "equal" ||
    Math.abs(customTotal - parsedAmount) < 0.01;

  const canReview =
    amount.trim() !== "" &&
    description.trim() !== "" &&
    payer !== "" &&
    splitsValid &&
    parsedAmount > 0;

  const payerName =
    members.find((m) => m.userId === payer)?.displayName ?? payer;

  function getMemberName(userId: string) {
    return members.find((m) => m.userId === userId)?.displayName ?? userId;
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    setStage("saving");
    try {
      const saved = await addExpense({
        groupId: groupId!,
        paidBy: payer,
        amount,
        token: token.symbol,
        description: description.trim(),
        splits,
      });
      const existing = getCachedExpenses(groupId!);
      cacheExpenses(groupId!, [saved, ...existing]);
      setStage("done");
    } catch (e: any) {
      Alert.alert("Failed to add expense", (e as Error).message);
      setStage("reviewing");
    }
  }

  // ---------------------------------------------------------------------------
  // Auto-navigate after done
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(t);
  }, [stage]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (stage === "done") {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center px-6">
        <Ionicons name="checkmark-circle" size={56} color="#4CAF50" />
        <Text className="text-green-400 text-xl font-bold mt-4">
          Expense added
        </Text>
      </View>
    );
  }

  if (stage === "saving") {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator color="#7B5EA7" size="large" />
        <Text className="text-neutral-400 mt-3">Saving…</Text>
      </View>
    );
  }

  if (stage === "reviewing") {
    return (
      <View className="flex-1 bg-neutral-950 px-6 pt-16">
        <Pressable onPress={() => setStage("input")} className="mb-6">
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white text-xl font-bold mb-4">Review Expense</Text>

        <View className="bg-neutral-900 rounded-2xl p-4 mb-6">
          <Text className="text-white font-bold text-lg">
            {payerName} paid {amount} {token.symbol}
          </Text>
          <Text className="text-neutral-400 mt-1">{description}</Text>

          <View className="mt-4">
            {splits.map((s) => (
              <View
                key={s.userId}
                className="flex-row justify-between mt-2"
              >
                <Text className="text-neutral-300">{getMemberName(s.userId)}</Text>
                <Text
                  className={
                    s.userId === payer ? "text-green-400" : "text-red-400"
                  }
                >
                  {s.userId === payer
                    ? "paid"
                    : `owes ${s.amount} ${token.symbol}`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          className="bg-purple-700 rounded-xl py-4 mb-3"
        >
          <Text className="text-white text-center font-bold">Confirm</Text>
        </Pressable>
        <Pressable onPress={() => setStage("input")} className="py-3">
          <Text className="text-neutral-400 text-center">Edit</Text>
        </Pressable>
      </View>
    );
  }

  // input stage
  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} className="mb-6">
        <Ionicons name="arrow-back" size={24} color="white" />
      </Pressable>
      <Text className="text-white text-2xl font-bold mb-6">Add Expense</Text>

      {/* Who paid */}
      <Text className="text-neutral-400 text-sm mb-2">Who paid?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
      >
        {members.map((m) => (
          <Pressable
            key={m.userId}
            onPress={() => setPayer(m.userId)}
            className={`px-4 py-2 rounded-full mr-2 ${
              payer === m.userId ? "bg-purple-700" : "bg-neutral-800"
            }`}
          >
            <Text className="text-white">{m.displayName}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Amount */}
      <Text className="text-neutral-400 text-sm mb-2">Amount</Text>
      <AmountInput
        value={amount}
        onChangeText={setAmount}
        selectedToken={token}
        onSelectToken={setToken}
      />

      {/* Description */}
      <TextInput
        placeholder="What's this for? (e.g. Pizza)"
        placeholderTextColor="#555"
        value={description}
        onChangeText={setDescription}
        className="bg-neutral-800 text-white rounded-xl px-4 py-3 mt-4"
      />

      {/* Split mode */}
      <View className="flex-row bg-neutral-900 rounded-xl p-1 mt-4 mb-3">
        <Pressable
          onPress={() => setSplitMode("equal")}
          className={`flex-1 py-2 rounded-lg ${
            splitMode === "equal" ? "bg-purple-700" : ""
          }`}
        >
          <Text className="text-white text-center text-sm">Equal</Text>
        </Pressable>
        <Pressable
          onPress={() => setSplitMode("custom")}
          className={`flex-1 py-2 rounded-lg ${
            splitMode === "custom" ? "bg-purple-700" : ""
          }`}
        >
          <Text className="text-white text-center text-sm">Custom</Text>
        </Pressable>
      </View>

      {/* Split breakdown */}
      {splitMode === "equal" ? (
        <View className="bg-neutral-900 rounded-xl p-3 mb-4">
          {equalSplits.map((s) => (
            <View
              key={s.userId}
              className="flex-row justify-between py-1"
            >
              <Text className="text-neutral-300">{getMemberName(s.userId)}</Text>
              <Text className="text-neutral-400">
                {s.amount} {token.symbol}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="bg-neutral-900 rounded-xl p-3 mb-2">
          {customSplits.map((s, i) => (
            <View
              key={s.userId}
              className="flex-row items-center justify-between py-1"
            >
              <Text className="text-neutral-300 flex-1">
                {getMemberName(s.userId)}
              </Text>
              <TextInput
                value={s.amount}
                onChangeText={(v) =>
                  setCustomSplits((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, amount: v } : x))
                  )
                }
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="decimal-pad"
                className="bg-neutral-800 text-white rounded-lg px-3 py-1 w-28 text-right"
              />
            </View>
          ))}
          <Text
            className={`text-xs mt-2 text-right ${
              splitsValid ? "text-neutral-500" : "text-red-400"
            }`}
          >
            {customTotal.toFixed(2)} / {parsedAmount.toFixed(2)} {token.symbol}{" "}
            assigned
            {!splitsValid && parsedAmount > 0
              ? ` — must total ${parsedAmount.toFixed(2)}`
              : ""}
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => setStage("reviewing")}
        disabled={!canReview}
        className={`rounded-xl py-4 mt-4 ${
          canReview ? "bg-purple-700" : "bg-neutral-800"
        }`}
      >
        <Text className="text-white text-center font-bold">Review</Text>
      </Pressable>
    </ScrollView>
  );
}
