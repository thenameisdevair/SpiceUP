import { supabase } from "./supabase";
import * as Crypto from "expo-crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroupMember {
  userId: string;          // Privy user ID (or phone hash for invited-but-not-joined)
  tongoId: string | null;  // "tongo:<x>:<y>" format — null if not yet onboarded
  starknetAddress: string | null;
  displayName: string;     // Phone number (formatted) or "You"
  phoneHash: string | null;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: number;       // epoch ms
  inviteToken?: string;    // populated after createGroup()
}

export interface ExpenseSplit {
  userId: string;
  amount: string;          // human-readable share (e.g. "3.33")
}

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;          // userId
  amount: string;          // total amount paid
  token: string;           // "STRK" | "ETH" | "USDC"
  description: string;
  splits: ExpenseSplit[];  // one entry per member
  settledBy: string[];     // userIds who have settled this expense
  createdAt: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  token: string;
  txHash: string | null;   // null until confirmed on-chain
  isPrivate: boolean;
  createdAt: number;
}

export interface NetBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;          // always positive
  token: string;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function createGroup(
  name: string,
  members: GroupMember[],
  creatorId: string
): Promise<Group> {
  // 1. Insert group
  const { data: groupRow, error: groupErr } = await supabase
    .from("groups")
    .insert({ name, creator_id: creatorId })
    .select("id, created_at")
    .single();

  if (groupErr || !groupRow) throw new Error(groupErr?.message ?? "Failed to create group");

  const groupId: string = groupRow.id;

  // 2. Fan-out members
  const memberRows = members.map((m) => ({
    group_id: groupId,
    user_id: m.userId,
    tongo_id: m.tongoId,
    starknet_address: m.starknetAddress,
    display_name: m.displayName,
    phone_hash: m.phoneHash,
  }));

  const { error: memberErr } = await supabase.from("group_members").insert(memberRows);
  if (memberErr) throw new Error(memberErr.message);

  // 3. Generate invite token
  const { data: inviteRow, error: inviteErr } = await supabase
    .from("group_invites")
    .insert({ group_id: groupId, created_by: creatorId })
    .select("token")
    .single();

  if (inviteErr || !inviteRow) throw new Error(inviteErr?.message ?? "Failed to create invite");

  return {
    id: groupId,
    name,
    members,
    createdAt: new Date(groupRow.created_at).getTime(),
    inviteToken: inviteRow.token,
  };
}

export async function getGroups(userId: string): Promise<Group[]> {
  // Get group IDs the user belongs to
  const { data: memberRows, error: mErr } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (mErr || !memberRows || memberRows.length === 0) return [];

  const groupIds = memberRows.map((r: any) => r.group_id as string);

  // Fetch groups + all members in one shot
  const [groupsRes, allMembersRes] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, created_at")
      .in("id", groupIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("group_id, user_id, tongo_id, starknet_address, display_name, phone_hash")
      .in("group_id", groupIds),
  ]);

  if (groupsRes.error) throw new Error(groupsRes.error.message);

  const allMembers: any[] = allMembersRes.data ?? [];

  return (groupsRes.data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    createdAt: new Date(g.created_at).getTime(),
    members: allMembers
      .filter((m) => m.group_id === g.id)
      .map((m) => ({
        userId: m.user_id,
        tongoId: m.tongo_id,
        starknetAddress: m.starknet_address,
        displayName: m.display_name,
        phoneHash: m.phone_hash,
      })),
  }));
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const [groupRes, membersRes] = await Promise.all([
    supabase.from("groups").select("id, name, created_at").eq("id", groupId).single(),
    supabase
      .from("group_members")
      .select("user_id, tongo_id, starknet_address, display_name, phone_hash")
      .eq("group_id", groupId),
  ]);

  if (groupRes.error || !groupRes.data) return null;

  const g = groupRes.data as any;
  return {
    id: g.id,
    name: g.name,
    createdAt: new Date(g.created_at).getTime(),
    members: (membersRes.data ?? []).map((m: any) => ({
      userId: m.user_id,
      tongoId: m.tongo_id,
      starknetAddress: m.starknet_address,
      displayName: m.display_name,
      phoneHash: m.phone_hash,
    })),
  };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function addMember(groupId: string, member: GroupMember): Promise<void> {
  const { error } = await supabase.from("group_members").upsert(
    {
      group_id: groupId,
      user_id: member.userId,
      tongo_id: member.tongoId,
      starknet_address: member.starknetAddress,
      display_name: member.displayName,
      phone_hash: member.phoneHash,
    },
    { onConflict: "group_id,user_id" }
  );
  if (error) throw new Error(error.message);
}

export async function resolveInvite(
  groupId: string,
  inviteToken: string
): Promise<Group | null> {
  const { data, error } = await supabase
    .from("group_invites")
    .select("token, used_at")
    .eq("token", inviteToken)
    .eq("group_id", groupId)
    .single();

  if (error || !data || data.used_at) return null;

  // Mark invite as used
  await supabase
    .from("group_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", inviteToken);

  return getGroup(groupId);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function addExpense(
  expense: Omit<Expense, "id" | "createdAt" | "settledBy">
): Promise<Expense> {
  const { data: expRow, error: expErr } = await supabase
    .from("expenses")
    .insert({
      group_id: expense.groupId,
      paid_by: expense.paidBy,
      amount: expense.amount,
      token: expense.token,
      description: expense.description,
    })
    .select("id, created_at")
    .single();

  if (expErr || !expRow) throw new Error(expErr?.message ?? "Failed to create expense");

  const expenseId: string = expRow.id;

  const splitRows = expense.splits.map((s) => ({
    expense_id: expenseId,
    user_id: s.userId,
    amount: s.amount,
    settled: false,
  }));

  const { error: splitErr } = await supabase.from("expense_splits").insert(splitRows);
  if (splitErr) throw new Error(splitErr.message);

  return {
    ...expense,
    id: expenseId,
    settledBy: [],
    createdAt: new Date(expRow.created_at).getTime(),
  };
}

export async function getExpenses(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(`
      id,
      group_id,
      paid_by,
      amount,
      token,
      description,
      created_at,
      expense_splits (
        user_id,
        amount,
        settled
      )
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((e: any) => ({
    id: e.id,
    groupId: e.group_id,
    paidBy: e.paid_by,
    amount: e.amount,
    token: e.token,
    description: e.description,
    splits: (e.expense_splits ?? []).map((s: any) => ({
      userId: s.user_id,
      amount: s.amount,
    })),
    settledBy: (e.expense_splits ?? [])
      .filter((s: any) => s.settled)
      .map((s: any) => s.user_id),
    createdAt: new Date(e.created_at).getTime(),
  }));
}

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export async function recordSettlement(
  s: Omit<Settlement, "id" | "createdAt">
): Promise<Settlement> {
  const { data, error } = await supabase
    .from("settlements")
    .insert({
      group_id: s.groupId,
      from_user_id: s.fromUserId,
      to_user_id: s.toUserId,
      amount: s.amount,
      token: s.token,
      tx_hash: s.txHash,
      is_private: s.isPrivate,
    })
    .select("id, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to record settlement");

  // Mark all unsettled splits for fromUserId in this group as settled
  const { data: splitIds } = await supabase
    .from("expense_splits")
    .select("id, expense_id")
    .eq("user_id", s.fromUserId)
    .eq("settled", false);

  if (splitIds && splitIds.length > 0) {
    // Filter to only splits belonging to expenses in this group
    const { data: groupExpenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("group_id", s.groupId);

    const groupExpenseIds = new Set((groupExpenses ?? []).map((e: any) => e.id));
    const toMarkIds = (splitIds as any[])
      .filter((sp) => groupExpenseIds.has(sp.expense_id))
      .map((sp) => sp.id);

    if (toMarkIds.length > 0) {
      await supabase
        .from("expense_splits")
        .update({ settled: true })
        .in("id", toMarkIds);
    }
  }

  return {
    ...s,
    id: data.id,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function getSettlements(groupId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((s: any) => ({
    id: s.id,
    groupId: s.group_id,
    fromUserId: s.from_user_id,
    toUserId: s.to_user_id,
    amount: s.amount,
    token: s.token,
    txHash: s.tx_hash,
    isPrivate: s.is_private,
    createdAt: new Date(s.created_at).getTime(),
  }));
}

// ---------------------------------------------------------------------------
// Net balance calculation (pure — no DB call)
// ---------------------------------------------------------------------------

export function calcNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  selfId: string
): NetBalance[] {
  // 1. Build raw balances: positive = is owed, negative = owes
  const raw: Record<string, number> = {};

  for (const exp of expenses) {
    const total = parseFloat(exp.amount);
    raw[exp.paidBy] = (raw[exp.paidBy] ?? 0) + total;
    for (const split of exp.splits) {
      raw[split.userId] = (raw[split.userId] ?? 0) - parseFloat(split.amount);
    }
  }

  // 2. Apply settlements
  for (const s of settlements) {
    raw[s.fromUserId] = (raw[s.fromUserId] ?? 0) + parseFloat(s.amount);
    raw[s.toUserId]   = (raw[s.toUserId]   ?? 0) - parseFloat(s.amount);
  }

  // 3. Greedy creditor/debtor matching
  const creditors = Object.entries(raw)
    .filter(([, v]) => v > 0.005)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v);

  const debtors = Object.entries(raw)
    .filter(([, v]) => v < -0.005)
    .map(([id, v]) => ({ id, v: -v }))
    .sort((a, b) => b.v - a.v);

  const result: NetBalance[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const settle = Math.min(creditors[ci].v, debtors[di].v);
    result.push({
      fromUserId: debtors[di].id,
      toUserId: creditors[ci].id,
      amount: Math.round(settle * 100) / 100,
      token: expenses[0]?.token ?? "USDC",
    });
    creditors[ci].v -= settle;
    debtors[di].v   -= settle;
    if (creditors[ci].v < 0.005) ci++;
    if (debtors[di].v  < 0.005) di++;
  }

  // 4. Filter to balances involving current user
  return result.filter((b) => b.fromUserId === selfId || b.toUserId === selfId);
}
