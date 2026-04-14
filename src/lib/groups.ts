/**
 * Groups domain types and pure helpers.
 * This file no longer ships seeded demo groups or expenses.
 */

export const SELF_MEMBER_ID = "self";

export interface GroupMember {
  id: string;
  name: string;
  avatarColor: string;
}

export interface ExpenseSplit {
  memberId: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  token: string;
  paidBy: string;
  splitMode: "equal" | "custom";
  splits: ExpenseSplit[];
  createdAt: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  token: string;
  isPrivate: boolean;
  createdAt: number;
}

export interface NetBalance {
  from: string;
  to: string;
  amount: number;
  token: string;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: number;
}

/**
 * Computes a minimal set of net balances (who owes whom) using greedy
 * creditor/debtor matching.
 */
export function calcNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  _selfId?: string
): NetBalance[] {
  const raw = new Map<string, number>();
  const getOrCreate = (id: string) => raw.get(id) ?? 0;

  for (const expense of expenses) {
    raw.set(expense.paidBy, getOrCreate(expense.paidBy) + expense.amount);

    for (const split of expense.splits) {
      raw.set(split.memberId, getOrCreate(split.memberId) - split.amount);
    }
  }

  for (const settlement of settlements) {
    raw.set(
      settlement.fromMemberId,
      getOrCreate(settlement.fromMemberId) + settlement.amount
    );
    raw.set(
      settlement.toMemberId,
      getOrCreate(settlement.toMemberId) - settlement.amount
    );
  }

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of raw.entries()) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) creditors.push({ id, amount: rounded });
    if (rounded < -0.01) debtors.push({ id, amount: -rounded });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const results: NetBalance[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const transfer = Math.min(creditor.amount, debtor.amount);

    if (transfer >= 0.01) {
      results.push({
        from: debtor.id,
        to: creditor.id,
        amount: Math.round(transfer * 100) / 100,
        token: "USDC",
      });
    }

    creditor.amount -= transfer;
    debtor.amount -= transfer;

    if (creditor.amount < 0.01) creditorIndex++;
    if (debtor.amount < 0.01) debtorIndex++;
  }

  return results;
}

const AVATAR_COLORS = [
  "#7B5EA7",
  "#4CAF50",
  "#FF9800",
  "#E91E63",
  "#2196F3",
  "#00BCD4",
  "#FF5722",
  "#9C27B0",
];

export function avatarColorForName(name: string): string {
  let hash = 0;

  for (let index = 0; index < name.length; index++) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
