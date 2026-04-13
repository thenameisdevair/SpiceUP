/**
 * Groups Data Module — SpiceUP
 * Types, net-balance calculation, and mock group data.
 */

// ─── Types ───────────────────────────────────────────────

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
  paidBy: string; // member id
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
  from: string; // owes
  to: string;   // is owed
  amount: number;
  token: string;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: number;
}

// ─── calcNetBalances ────────────────────────────────────
/**
 * Pure function that computes minimal set of net balances
 * (who owes whom) using greedy creditor/debtor matching.
 *
 * Algorithm:
 *  1. Build a raw balance map per member from expenses & settlements.
 *     Positive = net creditor (owed money), negative = net debtor (owes money).
 *  2. Separate into creditors (positive) and debtors (negative).
 *  3. Greedily match the largest creditor with the largest debtor,
 *     transferring the minimum of the two amounts.
 *  4. Repeat until all balances are settled.
 */
export function calcNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  _selfId?: string,
): NetBalance[] {
  // Step 1: Compute raw balances
  const raw = new Map<string, number>();

  const getOrCreate = (id: string) => raw.get(id) ?? 0;

  // Process expenses
  for (const exp of expenses) {
    // Payer paid the full amount → credit
    raw.set(exp.paidBy, getOrCreate(exp.paidBy) + exp.amount);

    // Each member's share → debit
    for (const split of exp.splits) {
      raw.set(split.memberId, getOrCreate(split.memberId) - split.amount);
    }
  }

  // Process settlements (already settled amounts)
  for (const s of settlements) {
    // fromMember has already paid → credit their balance
    raw.set(s.fromMemberId, getOrCreate(s.fromMemberId) + s.amount);
    // toMember has already received → debit their balance
    raw.set(s.toMemberId, getOrCreate(s.toMemberId) - s.amount);
  }

  // Step 2: Separate creditors and debtors
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of raw.entries()) {
    const rounded = Math.round(balance * 100) / 100; // avoid floating-point noise
    if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ id, amount: -rounded }); // store as positive
    }
  }

  // Sort descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Step 3: Greedy matching
  const results: NetBalance[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
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

    if (creditor.amount < 0.01) ci++;
    if (debtor.amount < 0.01) di++;
  }

  return results;
}

// ─── Deterministic avatar colors ─────────────────────────

const AVATAR_COLORS = [
  "#7B5EA7", // accent purple
  "#4CAF50", // green
  "#FF9800", // orange
  "#E91E63", // pink
  "#2196F3", // blue
  "#00BCD4", // cyan
  "#FF5722", // deep orange
  "#9C27B0", // purple
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Mock Data ───────────────────────────────────────────

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;

// --- Members ---
const YOU: GroupMember = { id: "self", name: "You", avatarColor: "#7B5EA7" };
const ALICE: GroupMember = { id: "alice", name: "Alice", avatarColor: colorForName("Alice") };
const BOB: GroupMember = { id: "bob", name: "Bob", avatarColor: colorForName("Bob") };
const CAROL: GroupMember = { id: "carol", name: "Carol", avatarColor: colorForName("Carol") };
const DAVE: GroupMember = { id: "dave", name: "Dave", avatarColor: colorForName("Dave") };
const EVE: GroupMember = { id: "eve", name: "Eve", avatarColor: colorForName("Eve") };

// --- Dinner Squad ---
export const MOCK_GROUPS: Group[] = [
  {
    id: "dinner-squad",
    name: "Dinner Squad",
    members: [YOU, ALICE, BOB],
    createdAt: NOW - 5 * DAY,
  },
  {
    id: "trip-fund",
    name: "Trip Fund",
    members: [YOU, CAROL, DAVE, EVE],
    createdAt: NOW - 10 * DAY,
  },
];

export const MOCK_EXPENSES: Expense[] = [
  // Dinner Squad expenses
  {
    id: "exp-1",
    groupId: "dinner-squad",
    description: "Pizza night 🍕",
    amount: 30,
    token: "USDC",
    paidBy: "self",
    splitMode: "equal",
    splits: [
      { memberId: "self", amount: 10 },
      { memberId: "alice", amount: 10 },
      { memberId: "bob", amount: 10 },
    ],
    createdAt: NOW - 2 * DAY,
  },
  {
    id: "exp-2",
    groupId: "dinner-squad",
    description: "Drinks at the bar 🍸",
    amount: 18,
    token: "USDC",
    paidBy: "alice",
    splitMode: "equal",
    splits: [
      { memberId: "self", amount: 6 },
      { memberId: "alice", amount: 6 },
      { memberId: "bob", amount: 6 },
    ],
    createdAt: NOW - 1 * DAY,
  },
  // Trip Fund expenses
  {
    id: "exp-3",
    groupId: "trip-fund",
    description: "Hotel booking 🏨",
    amount: 400,
    token: "USDC",
    paidBy: "self",
    splitMode: "equal",
    splits: [
      { memberId: "self", amount: 100 },
      { memberId: "carol", amount: 100 },
      { memberId: "dave", amount: 100 },
      { memberId: "eve", amount: 100 },
    ],
    createdAt: NOW - 3 * DAY,
  },
];

export const MOCK_SETTLEMENTS: Settlement[] = [];

// ─── Helpers ─────────────────────────────────────────────

/** Get a member's display name by id within a group */
export function getMemberName(groupId: string, memberId: string): string {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  if (!group) return memberId;
  const member = group.members.find((m) => m.id === memberId);
  return member?.name ?? memberId;
}

/** Get all members for a given group */
export function getGroupMembers(groupId: string): GroupMember[] {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  return group?.members ?? [];
}

/** Get expenses for a given group */
export function getGroupExpenses(groupId: string): Expense[] {
  return MOCK_EXPENSES.filter((e) => e.groupId === groupId);
}

/** Get settlements for a given group */
export function getGroupSettlements(groupId: string): Settlement[] {
  return MOCK_SETTLEMENTS.filter((s) => s.groupId === groupId);
}
