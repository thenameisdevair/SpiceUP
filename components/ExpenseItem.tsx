import { View, Text } from "react-native";
import type { Expense, GroupMember } from "@/lib/groups";

interface ExpenseItemProps {
  expense: Expense;
  selfId: string;
  members: GroupMember[];
}

export function ExpenseItem({ expense, selfId, members }: ExpenseItemProps) {
  const payerName =
    members.find((m) => m.userId === expense.paidBy)?.displayName ?? "Unknown";
  const mySplit = expense.splits.find((s) => s.userId === selfId);
  const iPaid = expense.paidBy === selfId;

  let shareText = "";
  let shareColor = "text-neutral-400";

  if (iPaid) {
    shareText = "You paid";
    shareColor = "text-green-400";
  } else if (mySplit) {
    const settled = expense.settledBy.includes(selfId);
    shareText = settled
      ? "Settled"
      : `You owe ${mySplit.amount} ${expense.token}`;
    shareColor = settled ? "text-neutral-500 line-through" : "text-red-400";
  }

  return (
    <View className="flex-row justify-between items-start py-3 border-b border-neutral-800">
      <View className="flex-1 pr-4">
        <Text className="text-white font-medium">{expense.description}</Text>
        <Text className="text-neutral-500 text-xs mt-0.5">
          {payerName} paid · {new Date(expense.createdAt).toLocaleDateString()}
        </Text>
        {shareText ? (
          <Text className={`${shareColor} text-xs mt-1`}>{shareText}</Text>
        ) : null}
      </View>
      <Text className="text-white font-bold">
        {expense.amount} {expense.token}
      </Text>
    </View>
  );
}
