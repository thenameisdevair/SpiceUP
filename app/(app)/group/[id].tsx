import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Address, Token } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { recordSettlement } from "@/lib/groups";
import { saveTx } from "@/lib/txHistory";
import { sendPrivate, parseTongoQr } from "@/lib/tongo";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import { TOKEN_BY_SYMBOL } from "@/constants/tokens";
import { ExpenseItem } from "@/components/ExpenseItem";
import type { NetBalance } from "@/lib/groups";

type SettleStage = "idle" | "sending" | "done";

export default function GroupDetail() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { privyUserId, starknetAddress, tongoRecipientId, wallet, tongo } =
    useAuthStore();
  const group = useGroupsStore((s) => s.groups.find((g) => g.id === groupId));
  const { expenses, netBalances, loading, refresh } = useGroupExpenses(
    groupId!
  );

  const toast = useToast();
  const [settleTarget, setSettleTarget] = useState<NetBalance | null>(null);
  const [settleStage, setSettleStage] = useState<SettleStage>("idle");
  const [isPrivate, setIsPrivate] = useState(true);

  // ---------------------------------------------------------------------------
  // Supabase Realtime subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `group_id=eq.${groupId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlements",
          filter: `group_id=eq.${groupId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getMember(userId: string | undefined) {
    if (!userId) return undefined;
    return group?.members.find((m) => m.userId === userId);
  }

  // ---------------------------------------------------------------------------
  // Settle
  // ---------------------------------------------------------------------------

  async function handleSettle() {
    if (!settleTarget || !wallet || !tongo || !group) return;
    setSettleStage("sending");

    try {
      const recipient = getMember(settleTarget.toUserId);
      if (!recipient) throw new Error("Recipient not found");

      const amountStr = String(settleTarget.amount);
      const tokenObj: Token = TOKEN_BY_SYMBOL[settleTarget.token] ?? TOKEN_BY_SYMBOL["USDC"];

      let txHash: string;

      if (isPrivate) {
        const recipientId = parseTongoQr(recipient.tongoId!);
        if (!recipientId) throw new Error("Invalid recipient Tongo address");
        const tx = await sendPrivate(wallet, tongo, recipientId, amountStr, tokenObj);
        txHash = tx.hash;
      } else {
        if (!recipient.starknetAddress) throw new Error("Recipient has no Starknet address");
        const amount = (require("starkzap") as typeof import("starkzap")).Amount.parse(amountStr, tokenObj);
        const tx = await wallet.wallet
          .tx()
          .transfer(tokenObj, { to: recipient.starknetAddress as Address, amount })
          .send();
        txHash = tx.hash;
      }

      await recordSettlement({
        groupId: groupId!,
        fromUserId: privyUserId!,
        toUserId: settleTarget.toUserId,
        amount: amountStr,
        token: settleTarget.token,
        txHash,
        isPrivate,
      });

      await saveTx({
        id: txHash,
        type: "send",
        amount: amountStr,
        token: settleTarget.token,
        counterparty: recipient.displayName,
        timestamp: Date.now(),
        txHash,
        isPrivate,
      });

      setSettleStage("done");
      setTimeout(() => {
        setSettleTarget(null);
        setSettleStage("idle");
        refresh();
      }, 1500);
    } catch (e: any) {
      setSettleStage("idle");
      toast.error((e as Error).message ?? "Settlement failed");
    }
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!group) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator color="#7B5EA7" />
      </View>
    );
  }

  const settleRecipient = getMember(settleTarget?.toUserId);
  const canPrivate = !!settleRecipient?.tongoId;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white text-xl font-bold flex-1 text-center">
          {group.name}
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(app)/group/add-expense",
              params: { groupId },
            })
          }
        >
          <Ionicons name="add-circle-outline" size={28} color="#7B5EA7" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Members row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 mb-4"
          contentContainerStyle={{ alignItems: "center" }}
        >
          {group.members.map((m) => (
            <View
              key={m.userId}
              className="bg-neutral-800 rounded-full px-3 py-1 mr-2"
            >
              <Text className="text-neutral-300 text-sm">{m.displayName}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Net balances */}
        <View className="px-4 mb-4">
          <Text className="text-neutral-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Net Balances
          </Text>

          {netBalances.length === 0 ? (
            <Text className="text-neutral-500 text-sm">
              You're all settled up!
            </Text>
          ) : (
            netBalances.map((b, i) => {
              const isOwing = b.fromUserId === privyUserId;
              const counterpart = getMember(isOwing ? b.toUserId : b.fromUserId);
              return (
                <View
                  key={i}
                  className="flex-row items-center justify-between bg-neutral-900 rounded-xl p-3 mb-2"
                >
                  <Text className={isOwing ? "text-red-400" : "text-green-400"}>
                    {isOwing
                      ? `You owe ${counterpart?.displayName} ${b.amount.toFixed(2)} ${b.token}`
                      : `${counterpart?.displayName} owes you ${b.amount.toFixed(2)} ${b.token}`}
                  </Text>
                  {isOwing ? (
                    <Pressable
                      onPress={() => {
                        setSettleTarget(b);
                        setIsPrivate(!!getMember(b.toUserId)?.tongoId);
                      }}
                      className="bg-purple-700 px-3 py-1.5 rounded-lg ml-2"
                    >
                      <Text className="text-white text-xs font-medium">
                        Settle
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() =>
                        toast.info("Remind feature coming soon.")
                      }
                      className="bg-neutral-700 px-3 py-1.5 rounded-lg ml-2"
                    >
                      <Text className="text-neutral-300 text-xs">Remind</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Expenses */}
        <View className="px-4">
          <Text className="text-neutral-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Expenses
          </Text>
          {expenses.length === 0 ? (
            <Text className="text-neutral-500 text-sm">
              No expenses yet — tap + to add one
            </Text>
          ) : (
            expenses.map((e) => (
              <ExpenseItem
                key={e.id}
                expense={e}
                selfId={privyUserId!}
                members={group.members}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Settle Modal */}
      <Modal
        visible={!!settleTarget}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (settleStage === "idle") {
            setSettleTarget(null);
          }
        }}
      >
        <View className="flex-1 justify-end">
          <View className="bg-neutral-900 rounded-t-3xl p-6">
            <Text className="text-white text-xl font-bold mb-4">
              Settle {settleTarget?.amount.toFixed(2)} {settleTarget?.token}{" "}
              with {settleRecipient?.displayName}
            </Text>

            {settleStage === "idle" && (
              <>
                {/* Private / Public toggle */}
                <View className="flex-row bg-neutral-800 rounded-xl p-1 mb-4">
                  <Pressable
                    onPress={() => setIsPrivate(true)}
                    disabled={!canPrivate}
                    className={`flex-1 py-2 rounded-lg ${
                      isPrivate ? "bg-purple-700" : ""
                    }`}
                  >
                    <Text className="text-white text-center text-sm">
                      Private{" "}
                      {!canPrivate ? "(unavailable)" : ""}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsPrivate(false)}
                    className={`flex-1 py-2 rounded-lg ${
                      !isPrivate ? "bg-neutral-600" : ""
                    }`}
                  >
                    <Text className="text-white text-center text-sm">
                      Public
                    </Text>
                  </Pressable>
                </View>

                {isPrivate && (
                  <Text className="text-purple-400 text-xs mb-4 text-center">
                    Amount will be hidden on-chain via ZK proof
                  </Text>
                )}

                <Pressable
                  onPress={handleSettle}
                  className="bg-purple-700 rounded-xl py-4"
                >
                  <Text className="text-white text-center font-bold">
                    Confirm & Settle
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSettleTarget(null)}
                  className="py-3 mt-1"
                >
                  <Text className="text-neutral-400 text-center">Cancel</Text>
                </Pressable>
              </>
            )}

            {settleStage === "sending" && (
              <View className="items-center py-6">
                <ActivityIndicator color="#7B5EA7" size="large" />
                <Text className="text-purple-400 mt-2">
                  {isPrivate ? "Generating ZK proof…" : "Sending…"}
                </Text>
              </View>
            )}

            {settleStage === "done" && (
              <View className="items-center py-6">
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color="#4CAF50"
                />
                <Text className="text-green-400 text-lg font-bold mt-2">
                  Settled!
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
