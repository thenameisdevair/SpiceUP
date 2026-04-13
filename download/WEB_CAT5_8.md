# SpiceUP Web — Categories 5–8 + Deployment (Next.js 15)

> **Combined rewrite** of Category 5 (Group Expenses), Category 6 (Yield & Earn), Category 7 (UI/UX), Category 8 (Testing & Deployment), and the standalone Deployment doc — all translated from React Native / Expo to **Next.js 15 App Router** for the web.

---

## Web Translation Cheatsheet

| React Native (Mobile) | Next.js Web Equivalent |
|---|---|
| `expo-router` | Next.js App Router (`app/` directory) |
| `NativeWind` | Tailwind CSS 4 |
| `@expo/vector-icons` (Ionicons) | `lucide-react` |
| `react-native-reanimated` | `framer-motion` |
| `expo-camera` (QR scanner) | `html5-qrcode` |
| QR generation | `qrcode.react` |
| `expo-font` / TTF assets | `next/font/google` (Inter) |
| `expo-secure-store` | `localStorage` |
| `@react-native-async-storage/async-storage` | `localStorage` |
| `expo-sqlite` | `localStorage` (JSON cache) |
| `expo-crypto` | Web Crypto API (`crypto.subtle.digest`) |
| `expo-clipboard` | `navigator.clipboard.writeText()` |
| `Share.share()` | `navigator.share()` |
| `Alert.alert()` | Custom `<Dialog>` / `window.confirm()` |
| `ActivityIndicator` | Tailwind spinner div |
| `Modal` (RN) | `<Dialog>` or portal overlay |
| `SafeAreaView` | Not needed on web |
| `useLocalSearchParams()` | `useParams()` from `next/navigation` |
| `router.push()` | `router.push()` from `next/navigation` |
| `router.replace()` | `router.replace()` from `next/navigation` |
| `Expo Router Tabs` | Custom sidebar / top-nav with `<Link>` |
| `Dimensions.get("window")` | Window object / CSS viewport units |
| `EAS Build` | `next build` + `vercel deploy` |
| `app.json` scheme / deep links | URL query params + `window.location` |
| `.env` `EXPO_PUBLIC_*` prefix | `NEXT_PUBLIC_*` prefix |

---

## Category 5 — Group Expenses (Web)

> **Goal**: Users can create groups, add shared expenses, and privately settle balances.

### Context (Web)

- Categories 1–4 complete: Privy auth, Starknet wallet, public/private transfers, fund/withdraw all working in Next.js.
- `useAuthStore` has `privyUserId`, `starknetAddress`, `tongoRecipientId`, `wallet`, `tongo`.
- `lib/tongo.ts` exports `sendPrivate()` and public send is handled by `app/(app)/send/page.tsx`.
- `lib/txHistory.ts` stores `TxRecord` to **localStorage** (200-record cap, newest-first).
- Supabase env vars pre-configured in `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — `@supabase/supabase-js` in `package.json`.
- Local cache uses **localStorage** instead of `expo-sqlite`.
- Phone hashing uses Web Crypto API instead of `expo-crypto`.

---

### 5.1 Data Model

> Identical to mobile — types, Supabase schema unchanged.

#### TypeScript Types (`lib/groups.ts` — NEW)

```typescript
export interface GroupMember {
  userId: string;
  tongoId: string | null;
  starknetAddress: string | null;
  displayName: string;
  phoneHash: string | null;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: number;
}

export interface ExpenseSplit {
  userId: string;
  amount: string;
}

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;
  amount: string;
  token: string;
  description: string;
  splits: ExpenseSplit[];
  settledBy: string[];
  createdAt: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  token: string;
  txHash: string | null;
  isPrivate: boolean;
  createdAt: number;
}

export interface NetBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;
  token: string;
}
```

#### Supabase Database Schema

Identical to mobile — no changes. Run the same SQL in the Supabase SQL editor:

```sql
CREATE TABLE user_profiles (
  privy_user_id TEXT PRIMARY KEY,
  phone_hash TEXT UNIQUE,
  starknet_address TEXT,
  tongo_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  tongo_id TEXT,
  starknet_address TEXT,
  display_name TEXT NOT NULL,
  phone_hash TEXT,
  UNIQUE(group_id, user_id)
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  paid_by TEXT NOT NULL,
  amount TEXT NOT NULL,
  token TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  settled BOOLEAN DEFAULT FALSE
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  token TEXT NOT NULL,
  tx_hash TEXT,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_invites (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);
```

---

### 5.2 Storage Strategy

#### `lib/supabase.ts` (NEW)

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

#### `lib/groups.ts` (NEW)

Contains all Supabase CRUD + net balance calculation. Business logic is **identical** to mobile.

```typescript
import { supabase } from "./supabase";

export async function createGroup(
  name: string,
  members: GroupMember[],
  creatorId: string
): Promise<Group> {
  // 1. INSERT into groups → get UUID
  const { data: groupRow, error: gErr } = await supabase
    .from("groups")
    .insert({ name, creator_id: creatorId })
    .select("id")
    .single();
  if (gErr) throw gErr;

  // 2. INSERT all members into group_members
  const memberRows = members.map((m) => ({
    group_id: groupRow.id,
    user_id: m.userId,
    tongo_id: m.tongoId,
    starknet_address: m.starknetAddress,
    display_name: m.displayName,
    phone_hash: m.phoneHash,
  }));
  await supabase.from("group_members").insert(memberRows);

  // 3. Generate invite token
  await supabase.from("group_invites").insert({
    group_id: groupRow.id,
    created_by: creatorId,
  });

  return {
    id: groupRow.id,
    name,
    members,
    createdAt: Date.now(),
  };
}

export async function getGroups(userId: string): Promise<Group[]> {
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (!memberRows?.length) return [];

  const groupIds = memberRows.map((r) => r.group_id);
  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });
  if (!groups) return [];

  // For each group, fetch members
  const result: Group[] = await Promise.all(
    groups.map(async (g) => {
      const { data: members } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", g.id);
      return {
        id: g.id,
        name: g.name,
        members: (members ?? []).map((m) => ({
          userId: m.user_id,
          tongoId: m.tongo_id,
          starknetAddress: m.starknet_address,
          displayName: m.display_name,
          phoneHash: m.phone_hash,
        })),
        createdAt: new Date(g.created_at).getTime(),
      };
    })
  );
  return result;
}

export async function addExpense(
  expense: Omit<Expense, "id" | "createdAt" | "settledBy">
): Promise<Expense> {
  const { data: expRow, error } = await supabase
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
  if (error) throw error;

  const splitRows = expense.splits.map((s) => ({
    expense_id: expRow.id,
    user_id: s.userId,
    amount: s.amount,
  }));
  await supabase.from("expense_splits").insert(splitRows);

  return {
    ...expense,
    id: expRow.id,
    settledBy: [],
    createdAt: new Date(expRow.created_at).getTime(),
  };
}

export async function getExpenses(groupId: string): Promise<Expense[]> {
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (!expenses) return [];

  const result: Expense[] = await Promise.all(
    expenses.map(async (e) => {
      const { data: splits } = await supabase
        .from("expense_splits")
        .select("*")
        .eq("expense_id", e.id);
      const { data: settledSplits } = await supabase
        .from("expense_splits")
        .select("user_id")
        .eq("expense_id", e.id)
        .eq("settled", true);
      return {
        id: e.id,
        groupId: e.group_id,
        paidBy: e.paid_by,
        amount: e.amount,
        token: e.token,
        description: e.description,
        splits: (splits ?? []).map((s) => ({
          userId: s.user_id,
          amount: s.amount,
        })),
        settledBy: (settledSplits ?? []).map((s) => s.user_id),
        createdAt: new Date(e.created_at).getTime(),
      };
    })
  );
  return result;
}

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
  if (error) throw error;

  // Mark relevant splits as settled
  await supabase
    .from("expense_splits")
    .update({ settled: true })
    .eq("user_id", s.fromUserId)
    .eq("settled", false);

  return { ...s, id: data.id, createdAt: new Date(data.created_at).getTime() };
}

export async function getSettlements(groupId: string): Promise<Settlement[]> {
  const { data } = await supabase
    .from("settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((s) => ({
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

export async function addMember(groupId: string, member: GroupMember): Promise<void> {
  await supabase.from("group_members").upsert(
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
}

export async function resolveInvite(
  groupId: string,
  inviteToken: string
): Promise<Group | null> {
  const { data, error } = await supabase
    .from("group_invites")
    .select("group_id, used_at")
    .eq("token", inviteToken)
    .eq("group_id", groupId)
    .eq("used_at", null)
    .single();
  if (error || !data) return null;

  await supabase
    .from("group_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", inviteToken);

  return getGroup(groupId);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data: g } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();
  if (!g) return null;

  const { data: members } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId);

  return {
    id: g.id,
    name: g.name,
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      tongoId: m.tongo_id,
      starknetAddress: m.starknet_address,
      displayName: m.display_name,
      phoneHash: m.phone_hash,
    })),
    createdAt: new Date(g.created_at).getTime(),
  };
}

// ── Net Balance Calculation (pure — no DB call) ──

export function calcNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  selfId: string
): NetBalance[] {
  const raw: Record<string, number> = {};

  for (const exp of expenses) {
    const total = parseFloat(exp.amount);
    raw[exp.paidBy] = (raw[exp.paidBy] ?? 0) + total;
    for (const split of exp.splits) {
      raw[split.userId] = (raw[split.userId] ?? 0) - parseFloat(split.amount);
    }
  }

  for (const s of settlements) {
    raw[s.fromUserId] = (raw[s.fromUserId] ?? 0) + parseFloat(s.amount);
    raw[s.toUserId] = (raw[s.toUserId] ?? 0) - parseFloat(s.amount);
  }

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
    debtors[di].v -= settle;
    if (creditors[ci].v < 0.005) ci++;
    if (debtors[di].v < 0.005) di++;
  }

  return result.filter(b => b.fromUserId === selfId || b.toUserId === selfId);
}
```

#### `lib/groupsCache.ts` (NEW — localStorage instead of SQLite)

```typescript
import type { Group, Expense } from "./groups";

const GROUPS_KEY = "spiceup_cached_groups";
const EXPENSES_PREFIX = "spiceup_cached_expenses_";

export function cacheGroups(groups: Group[]): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // localStorage full — evict oldest or ignore
  }
}

export function cacheExpenses(groupId: string, expenses: Expense[]): void {
  try {
    localStorage.setItem(EXPENSES_PREFIX + groupId, JSON.stringify(expenses));
  } catch {
    // ignore
  }
}

export function getCachedGroups(): Group[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    return raw ? (JSON.parse(raw) as Group[]) : [];
  } catch {
    return [];
  }
}

export function getCachedExpenses(groupId: string): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_PREFIX + groupId);
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}
```

#### `stores/groups.ts` (NEW — Zustand)

Identical to mobile — Zustand is platform-agnostic.

```typescript
import { create } from "zustand";
import type { Group } from "@/lib/groups";

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  loading: false,
  error: null,
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

#### `hooks/useGroups.ts` (NEW)

```typescript
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { getGroups } from "@/lib/groups";
import { cacheGroups, getCachedGroups } from "@/lib/groupsCache";

export function useGroups() {
  const { privyUserId } = useAuthStore();
  const { groups, setGroups, setLoading, setError } = useGroupsStore();

  const fetch = useCallback(async () => {
    if (!privyUserId) return;
    const cached = getCachedGroups();
    if (cached.length > 0) setGroups(cached);

    setLoading(true);
    try {
      const fresh = await getGroups(privyUserId);
      setGroups(fresh);
      cacheGroups(fresh);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [privyUserId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { groups, refresh: fetch };
}
```

#### `hooks/useGroupExpenses.ts` (NEW)

```typescript
import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/auth";
import { getExpenses, getSettlements, calcNetBalances } from "@/lib/groups";
import { cacheExpenses, getCachedExpenses } from "@/lib/groupsCache";
import type { Expense, Settlement, NetBalance } from "@/lib/groups";

export function useGroupExpenses(groupId: string) {
  const { privyUserId } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    const cached = getCachedExpenses(groupId);
    if (cached.length > 0) setExpenses(cached);

    setLoading(true);
    try {
      const [freshExp, freshSettle] = await Promise.all([
        getExpenses(groupId),
        getSettlements(groupId),
      ]);
      setExpenses(freshExp);
      setSettlements(freshSettle);
      cacheExpenses(groupId, freshExp);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  const netBalances: NetBalance[] = useMemo(
    () => (privyUserId ? calcNetBalances(expenses, settlements, privyUserId) : []),
    [expenses, settlements, privyUserId]
  );

  return { expenses, settlements, netBalances, loading, refresh: fetch };
}
```

---

### 5.3 Create Group Flow

#### `lib/resolver.ts` (NEW — Web Crypto instead of expo-crypto)

```typescript
import { supabase } from "./supabase";
import type { GroupMember } from "./groups";

async function hashPhone(phone: string): Promise<string> {
  const normalized = phone.replace(/\s/g, "");
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function resolvePhone(phone: string): Promise<GroupMember | null> {
  const hash = await hashPhone(phone);
  const { data } = await supabase
    .from("user_profiles")
    .select("privy_user_id, tongo_id, starknet_address, display_name")
    .eq("phone_hash", hash)
    .single();
  if (!data) return null;
  return {
    userId: data.privy_user_id,
    tongoId: data.tongo_id,
    starknetAddress: data.starknet_address,
    displayName: data.display_name,
    phoneHash: hash,
  };
}

export async function registerProfile(
  privyUserId: string,
  phone: string,
  starknetAddress: string,
  tongoId: string
): Promise<void> {
  const hash = await hashPhone(phone);
  await supabase.from("user_profiles").upsert(
    {
      privy_user_id: privyUserId,
      phone_hash: hash,
      starknet_address: starknetAddress,
      tongo_id: tongoId,
      display_name: phone,
    },
    { onConflict: "privy_user_id" }
  );
}
```

#### `app/(app)/groups/new/page.tsx` (NEW — replaces `app/(app)/group/new.tsx`)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { createGroup } from "@/lib/groups";
import { resolvePhone } from "@/lib/resolver";
import { parseTongoQr } from "@/lib/tongo";
import type { GroupMember } from "@/lib/groups";
import { X, Users, Plus, ChevronRight, Loader2 } from "lucide-react";

type Stage = "naming" | "adding_members" | "creating" | "done";

export default function NewGroupPage() {
  const router = useRouter();
  const { privyUserId, starknetAddress, tongoRecipientId } = useAuthStore();
  const { addGroup } = useGroupsStore();

  const [stage, setStage] = useState<Stage>("naming");
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [phoneQuery, setPhoneQuery] = useState("");
  const [phoneResult, setPhoneResult] = useState<GroupMember | null | "not_found" | "searching">(null);
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string } | null>(null);

  // Add self as first member on mount
  useState(() => {
    if (privyUserId) {
      setMembers([{
        userId: privyUserId,
        tongoId: tongoRecipientId ? `tongo:${tongoRecipientId.x}:${tongoRecipientId.y}` : null,
        starknetAddress: starknetAddress ?? null,
        displayName: "You",
        phoneHash: null,
      }]);
    }
  });

  async function handleSearchPhone() {
    if (!phoneQuery.trim()) return;
    setPhoneResult("searching");
    const result = await resolvePhone(phoneQuery.trim());
    setPhoneResult(result);
  }

  function addFoundMember() {
    if (phoneResult && typeof phoneResult !== "string") {
      setMembers((prev) => [...prev, phoneResult]);
      setPhoneQuery("");
      setPhoneResult(null);
    }
  }

  function addMemberAnyway() {
    // Member not yet on SpiceUP — add with phone only
    const placeholder: GroupMember = {
      userId: `phone_${phoneQuery.trim().replace(/[^a-z0-9]/gi, "_")}`,
      tongoId: null,
      starknetAddress: null,
      displayName: phoneQuery.trim(),
      phoneHash: null,
    };
    setMembers((prev) => [...prev, placeholder]);
    setPhoneQuery("");
    setPhoneResult(null);
  }

  function removeMember(userId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  async function handleCreate() {
    setStage("creating");
    try {
      const group = await createGroup(groupName, members, privyUserId!);
      addGroup(group);
      setCreatedGroup({ id: group.id, name: group.name });
      setStage("done");
    } catch (e) {
      alert(`Failed to create group: ${(e as Error).message}`);
      setStage("adding_members");
    }
  }

  async function handleShareInvite() {
    const inviteUrl = `${window.location.origin}/join?groupId=${createdGroup!.id}`;
    if (navigator.share) {
      await navigator.share({ title: "Join SpiceUP Group", url: inviteUrl });
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied to clipboard!");
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Back button */}
        <button onClick={() => router.back()} className="mb-6 text-neutral-400 hover:text-white">
          ← Back
        </button>

        {stage === "naming" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Create Group</h1>
            <input
              type="text"
              placeholder="Group name (e.g. Lunch, Trip)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-[#141414] border border-[#222] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#7B5EA7] mb-4"
              autoFocus
            />
            <button
              disabled={groupName.trim().length < 2}
              onClick={() => setStage("adding_members")}
              className="w-full bg-[#7B5EA7] hover:bg-[#6B4E97] disabled:opacity-40 rounded-xl py-3 font-semibold transition"
            >
              Next
            </button>
          </div>
        )}

        {stage === "adding_members" && (
          <div>
            <h1 className="text-2xl font-bold mb-4">{groupName}</h1>

            {/* Members chip row */}
            <div className="flex flex-wrap gap-2 mb-6">
              {members.map((m) => (
                <span key={m.userId} className="inline-flex items-center bg-[#1A1A1A] rounded-full px-3 py-1 text-sm">
                  {m.displayName}
                  {m.userId !== privyUserId && (
                    <button onClick={() => removeMember(m.userId)} className="ml-1 text-neutral-400 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* Phone search */}
            <div className="flex gap-2 mb-4">
              <input
                type="tel"
                placeholder="Search by phone number"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchPhone()}
                className="flex-1 bg-[#141414] border border-[#222] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#7B5EA7]"
              />
              <button onClick={handleSearchPhone} className="bg-[#7B5EA7] px-4 rounded-xl font-medium">
                Search
              </button>
            </div>

            {/* Search result */}
            {phoneResult === "searching" && (
              <div className="flex items-center gap-2 text-neutral-400 mb-4">
                <Loader2 size={16} className="animate-spin" /> Searching...
              </div>
            )}
            {phoneResult === "not_found" && (
              <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
                <p className="text-neutral-400 text-sm mb-2">Not on SpiceUP yet — they can join via invite link</p>
                <button onClick={addMemberAnyway} className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-lg text-sm transition">
                  Add anyway
                </button>
              </div>
            )}
            {phoneResult && typeof phoneResult !== "string" && (
              <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{phoneResult.displayName}</p>
                  <p className="text-neutral-400 text-sm">
                    {phoneResult.tongoId ? "SpiceUP user" : "Registered"}
                  </p>
                </div>
                <button onClick={addFoundMember} className="bg-[#7B5EA7] px-4 py-2 rounded-lg text-sm font-medium">
                  Add
                </button>
              </div>
            )}

            {/* Paste Tongo address */}
            <details className="mb-6">
              <summary className="text-[#7B5EA7] cursor-pointer text-sm">Paste Tongo address</summary>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="tongo:&lt;x&gt;:&lt;y&gt;"
                  className="w-full bg-[#141414] border border-[#222] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#7B5EA7]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = parseTongoQr((e.target as HTMLInputElement).value);
                      if (parsed) {
                        setMembers((prev) => [...prev, {
                          userId: crypto.randomUUID(),
                          tongoId: (e.target as HTMLInputElement).value,
                          starknetAddress: null,
                          displayName: `${parsed.x.toString().slice(0, 6)}...`,
                          phoneHash: null,
                        }]);
                        (e.target as HTMLInputElement).value = "";
                      } else {
                        alert("Invalid Tongo address. Use format: tongo:x:y");
                      }
                    }
                  }}
                />
              </div>
            </details>

            <button
              disabled={members.length < 2}
              onClick={handleCreate}
              className="w-full bg-[#7B5EA7] hover:bg-[#6B4E97] disabled:opacity-40 rounded-xl py-3 font-semibold transition"
            >
              Create Group ({members.length} members)
            </button>
          </div>
        )}

        {stage === "creating" && (
          <div className="flex flex-col items-center py-20">
            <Loader2 size={32} className="animate-spin text-[#7B5EA7]" />
            <p className="text-neutral-400 mt-4">Creating group...</p>
          </div>
        )}

        {stage === "done" && createdGroup && (
          <div className="flex flex-col items-center py-12">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <ChevronRight size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">{createdGroup.name} created!</h2>

            <button onClick={handleShareInvite} className="bg-[#7B5EA7] hover:bg-[#6B4E97] rounded-xl px-6 py-3 font-semibold mb-4 transition">
              Share Invite Link
            </button>
            <button
              onClick={() => router.push(`/groups/${createdGroup.id}`)}
              className="text-[#7B5EA7] hover:underline"
            >
              Open Group →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Invite Link Handler — `app/join/page.tsx` (NEW)

Replaces the Expo Router deep link handler. Uses URL query params instead of native scheme.

```typescript
"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { resolveInvite, addMember } from "@/lib/groups";

export default function JoinGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const token = searchParams.get("token");
  const { privyUserId, starknetAddress, tongoRecipientId } = useAuthStore();

  useEffect(() => {
    if (!groupId || !token || !privyUserId) return;

    resolveInvite(groupId, token).then(async (group) => {
      if (!group) {
        alert("Invalid or expired invite link.");
        router.replace("/");
        return;
      }
      const alreadyMember = group.members.some((m) => m.userId === privyUserId);
      if (!alreadyMember) {
        await addMember(groupId, {
          userId: privyUserId,
          tongoId: tongoRecipientId ? `tongo:${tongoRecipientId.x}:${tongoRecipientId.y}` : null,
          starknetAddress: starknetAddress ?? null,
          displayName: "Me",
          phoneHash: null,
        });
      }
      router.replace(`/groups/${groupId}`);
    });
  }, [groupId, token, privyUserId]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#7B5EA7]" />
    </div>
  );
}
```

---

### 5.4 Add Expense Flow

#### `app/(app)/groups/[id]/add-expense/page.tsx` (NEW)

```typescript
"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { addExpense } from "@/lib/groups";
import { cacheExpenses, getCachedExpenses } from "@/lib/groupsCache";
import type { GroupMember, ExpenseSplit, Expense } from "@/lib/groups";
import { Loader2, CheckCircle } from "lucide-react";

type Stage = "input" | "reviewing" | "saving" | "done";

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { groups } = useGroupsStore();
  const { privyUserId } = useAuthStore();

  const group = groups.find((g) => g.id === groupId);
  const [stage, setStage] = useState<Stage>("input");
  const [payer, setPayer] = useState(privyUserId ?? "");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDC");
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const splits: ExpenseSplit[] = useMemo(() => {
    if (!group) return [];
    if (splitMode === "equal") {
      const total = parseFloat(amount);
      if (isNaN(total) || total <= 0) return [];
      const base = Math.floor((total / group.members.length) * 100) / 100;
      const remainder = parseFloat((total - base * group.members.length).toFixed(2));
      return group.members.map((m, i) => ({
        userId: m.userId,
        amount: i === 0 ? String(+(base + remainder).toFixed(2)) : String(base),
      }));
    }
    return group.members.map((m) => ({
      userId: m.userId,
      amount: customSplits[m.userId] ?? "0",
    }));
  }, [group, amount, splitMode, customSplits]);

  const splitsValid = useMemo(() => {
    if (splitMode === "equal") return true;
    const total = Object.values(customSplits).reduce((s, v) => s + parseFloat(v || "0"), 0);
    return Math.abs(total - parseFloat(amount)) < 0.01;
  }, [splitMode, customSplits, amount]);

  const canReview = amount && description && payer && splitsValid;

  async function handleSave() {
    setStage("saving");
    try {
      const saved = await addExpense({ groupId, paidBy: payer, amount, token, description, splits });
      const cached = getCachedExpenses(groupId);
      cacheExpenses(groupId, [saved, ...cached]);
      setStage("done");
    } catch (e) {
      alert(`Failed: ${(e as Error).message}`);
      setStage("input");
    }
  }

  const memberName = (uid: string) =>
    uid === privyUserId ? "You" : group?.members.find((m) => m.userId === uid)?.displayName ?? uid;

  if (!group) return <div className="min-h-screen bg-[#0D0D0D] text-white p-4">Group not found</div>;

  if (stage === "saving") return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#7B5EA7]" />
    </div>
  );

  if (stage === "done") return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
      <CheckCircle size={48} className="text-green-400 mb-4" />
      <h2 className="text-xl font-bold text-green-400 mb-2">Expense added</h2>
      {useEffect(() => { const t = setTimeout(() => router.back(), 1500); return () => clearTimeout(t); }, [])}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <button onClick={() => router.back()} className="mb-6 text-neutral-400 hover:text-white">← Back</button>
        <h1 className="text-2xl font-bold mb-6">Add Expense</h1>

        {stage === "input" && (
          <div className="space-y-4">
            {/* Who paid */}
            <div>
              <label className="text-sm text-neutral-400 mb-2 block">Who paid?</label>
              <div className="flex flex-wrap gap-2">
                {group.members.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => setPayer(m.userId)}
                    className={`px-4 py-2 rounded-full text-sm transition ${payer === m.userId ? "bg-[#7B5EA7]" : "bg-[#1A1A1A] text-neutral-300"}`}
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm text-neutral-400 mb-2 block">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-[#141414] border border-[#222] rounded-xl px-4 py-3 text-white text-2xl font-semibold focus:outline-none focus:border-[#7B5EA7]"
                />
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-[#141414] border border-[#222] rounded-xl px-3 text-white focus:outline-none"
                >
                  <option value="USDC">USDC</option>
                  <option value="STRK">STRK</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <input
              type="text"
              placeholder="What's this for? (e.g. Pizza)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#141414] border border-[#222] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#7B5EA7]"
            />

            {/* Split toggle */}
            <div className="flex gap-2">
              <button onClick={() => setSplitMode("equal")} className={`px-4 py-2 rounded-lg text-sm ${splitMode === "equal" ? "bg-[#7B5EA7]" : "bg-[#1A1A1A]"}`}>
                Equal split
              </button>
              <button onClick={() => setSplitMode("custom")} className={`px-4 py-2 rounded-lg text-sm ${splitMode === "custom" ? "bg-[#7B5EA7]" : "bg-[#1A1A1A]"}`}>
                Custom
              </button>
            </div>

            {/* Splits display */}
            <div className="bg-[#141414] rounded-xl p-4 space-y-2">
              {splits.map((s) => (
                <div key={s.userId} className="flex justify-between text-sm">
                  <span className="text-neutral-300">{memberName(s.userId)}</span>
                  {splitMode === "custom" ? (
                    <input
                      type="number"
                      step="any"
                      value={customSplits[s.userId] ?? ""}
                      onChange={(e) => setCustomSplits({ ...customSplits, [s.userId]: e.target.value })}
                      className="w-24 bg-[#1A1A1A] border border-[#222] rounded px-2 py-1 text-right text-white text-sm focus:outline-none"
                    />
                  ) : (
                    <span className={s.userId === payer ? "text-green-400" : "text-neutral-400"}>
                      {s.userId === payer ? "paid" : `${s.amount} ${token}`}
                    </span>
                  )}
                </div>
              ))}
              {splitMode === "custom" && (
                <p className={`text-xs ${splitsValid ? "text-neutral-500" : "text-red-400"}`}>
                  {Object.values(customSplits).reduce((s, v) => s + parseFloat(v || "0"), 0).toFixed(2)} / {amount} assigned
                </p>
              )}
            </div>

            <button
              disabled={!canReview}
              onClick={() => setStage("reviewing")}
              className="w-full bg-[#7B5EA7] hover:bg-[#6B4E97] disabled:opacity-40 rounded-xl py-3 font-semibold transition"
            >
              Review
            </button>
          </div>
        )}

        {stage === "reviewing" && (
          <div className="space-y-4">
            <div className="bg-[#141414] rounded-xl p-6">
              <p className="text-lg font-bold">{memberName(payer)} paid {amount} {token}</p>
              <p className="text-neutral-400 mt-1">{description}</p>
              <div className="mt-4 space-y-2">
                {splits.map((s) => (
                  <div key={s.userId} className="flex justify-between text-sm">
                    <span className="text-neutral-300">{memberName(s.userId)}</span>
                    <span className={s.userId === payer ? "text-green-400" : "text-neutral-400"}>
                      {s.userId === payer ? "paid" : `owes ${s.amount} ${token}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStage("input")} className="flex-1 bg-[#1A1A1A] rounded-xl py-3 font-medium">Edit</button>
              <button onClick={handleSave} className="flex-1 bg-[#7B5EA7] hover:bg-[#6B4E97] rounded-xl py-3 font-semibold transition">Confirm</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 5.5 Settle Up Flow

#### `app/(app)/groups/[id]/page.tsx` (NEW — group detail + settle modal)

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { recordSettlement } from "@/lib/groups";
import { saveTx } from "@/lib/txHistory";
import { sendPrivate } from "@/lib/tongo";
import { parseTongoQr } from "@/lib/tongo";
import { supabase } from "@/lib/supabase";
import { TOKENS } from "@/constants/tokens";
import { Loader2, Plus, Lock, Globe, ShieldCheck, ArrowLeft } from "lucide-react";
import type { NetBalance } from "@/lib/groups";

type SettleStage = "idle" | "sending" | "done";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const group = useGroupsStore((s) => s.groups.find((g) => g.id === groupId));
  const { expenses, settlements, netBalances, loading, refresh } = useGroupExpenses(groupId);
  const { wallet, tongo, privyUserId, starknetAddress } = useAuthStore();

  const [settleTarget, setSettleTarget] = useState<NetBalance | null>(null);
  const [settleStage, setSettleStage] = useState<SettleStage>("idle");
  const [isPrivate, setIsPrivate] = useState(true);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${groupId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "settlements", filter: `group_id=eq.${groupId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  async function handleSettle() {
    if (!settleTarget || !wallet || !tongo || !privyUserId) return;
    setSettleStage("sending");
    try {
      const recipient = group!.members.find((m) => m.userId === settleTarget.toUserId)!;
      const amountStr = String(settleTarget.amount);
      const token = TOKENS[settleTarget.token as keyof typeof TOKENS];
      let txHash: string;

      if (isPrivate) {
        const recipientId = parseTongoQr(recipient.tongoId!)!;
        const tx = await sendPrivate(wallet, tongo, recipientId, amountStr, token);
        txHash = tx.hash;
      } else {
        const tx = await wallet.tx()
          .transfer(recipient.starknetAddress!, token.parse(amountStr))
          .send();
        txHash = tx.hash;
      }

      await recordSettlement({ groupId, fromUserId: privyUserId, toUserId: settleTarget.toUserId, amount: amountStr, token: settleTarget.token, txHash, isPrivate });
      await saveTx({ id: txHash, type: "send", amount: amountStr, token: settleTarget.token, counterparty: recipient.displayName, timestamp: Date.now(), txHash, isPrivate });

      setSettleStage("done");
      setTimeout(() => { setSettleTarget(null); setSettleStage("idle"); refresh(); }, 1500);
    } catch (e) {
      setSettleStage("idle");
      alert(`Settlement failed: ${(e as Error).message}`);
    }
  }

  if (!group) return <div className="min-h-screen bg-[#0D0D0D] text-white p-4">Group not found</div>;

  const memberName = (uid: string) => uid === privyUserId ? "You" : group.members.find((m) => m.userId === uid)?.displayName ?? uid;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-neutral-400 hover:text-white"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <button onClick={() => router.push(`/groups/${groupId}/add-expense`)} className="text-[#7B5EA7]"><Plus size={24} /></button>
        </div>

        {/* Members */}
        <div className="flex flex-wrap gap-2 mb-6">
          {group.members.map((m) => (
            <span key={m.userId} className="bg-[#1A1A1A] rounded-full px-3 py-1 text-sm">{m.displayName}</span>
          ))}
        </div>

        {/* Net Balances */}
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Net Balances</h2>
        {netBalances.length === 0 ? (
          <p className="text-neutral-500 text-sm mb-6">You're all settled up! 🎉</p>
        ) : (
          <div className="space-y-2 mb-6">
            {netBalances.map((b, i) => {
              const isOwed = b.toUserId === privyUserId;
              return (
                <div key={i} className="bg-[#141414] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${isOwed ? "text-green-400" : "text-red-400"}`}>
                      {isOwed ? `${memberName(b.fromUserId)} owes you` : `You owe ${memberName(b.toUserId)}`}
                    </p>
                    <p className="text-lg font-bold">{b.amount.toFixed(2)} {b.token}</p>
                  </div>
                  {!isOwed ? (
                    <button onClick={() => { setSettleTarget(b); setIsPrivate(true); }} className="bg-[#7B5EA7] hover:bg-[#6B4E97] px-4 py-2 rounded-lg text-sm font-semibold transition">
                      Settle
                    </button>
                  ) : (
                    <span className="text-neutral-500 text-sm">Coming soon</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Expenses */}
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Expenses</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#7B5EA7]" /></div>
        ) : expenses.length === 0 ? (
          <p className="text-neutral-500 text-sm">No expenses yet</p>
        ) : (
          <div className="divide-y divide-[#222]">
            {expenses.map((exp) => (
              <div key={exp.id} className="py-3 flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <p className="font-medium">{exp.description}</p>
                  <p className="text-neutral-500 text-xs mt-0.5">{memberName(exp.paidBy)} paid · {new Date(exp.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs mt-1">{exp.paidBy === privyUserId ? "You paid" : `You owe ${exp.splits.find((s) => s.userId === privyUserId)?.amount ?? "0"} ${exp.token}`}</p>
                </div>
                <p className="font-bold whitespace-nowrap">{exp.amount} {exp.token}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {settleTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => { if (settleStage === "idle") setSettleTarget(null); }}>
          <div className="bg-[#141414] rounded-t-3xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
              Settle {settleTarget.amount.toFixed(2)} {settleTarget.token} with {memberName(settleTarget.toUserId)}
            </h2>

            {settleStage === "idle" && (
              <>
                <div className="flex gap-1 bg-[#1A1A1A] rounded-xl p-1 mb-6">
                  <button onClick={() => setIsPrivate(true)} disabled={!group.members.find((m) => m.userId === settleTarget.toUserId)?.tongoId} className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 ${isPrivate ? "bg-[#7B5EA7]" : ""}`}>
                    <Lock size={14} /> Private
                  </button>
                  <button onClick={() => setIsPrivate(false)} className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 ${!isPrivate ? "bg-[#2A2A2A]" : ""}`}>
                    <Globe size={14} /> Public
                  </button>
                </div>
                {isPrivate && <p className="text-purple-400 text-xs text-center mb-4">Amount will be hidden on-chain via ZK proof</p>}
                <button onClick={handleSettle} className="w-full bg-[#7B5EA7] hover:bg-[#6B4E97] rounded-xl py-4 font-bold transition">Confirm &amp; Settle</button>
              </>
            )}

            {settleStage === "sending" && (
              <div className="flex flex-col items-center py-6">
                <Loader2 size={32} className="animate-spin text-[#7B5EA7]" />
                <p className="text-purple-400 mt-2">{isPrivate ? "Generating ZK proof..." : "Sending..."}</p>
              </div>
            )}

            {settleStage === "done" && (
              <div className="flex flex-col items-center py-6">
                <ShieldCheck size={48} className="text-green-400" />
                <p className="text-green-400 text-lg font-bold mt-2">Settled!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 5.6 Groups List Screen

#### `app/(app)/groups/page.tsx` (NEW)

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useGroups } from "@/hooks/useGroups";
import { useGroupsStore } from "@/stores/groups";
import { useAuthStore } from "@/stores/auth";
import { Plus, Users, Loader2 } from "lucide-react";
import { calcNetBalances, getCachedExpenses } from "@/lib/groups";
import Link from "next/link";

export default function GroupsPage() {
  const router = useRouter();
  const { groups, refresh } = useGroups();
  const { loading } = useGroupsStore();
  const { privyUserId } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-6">Groups</h1>

        {loading && groups.length === 0 ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#7B5EA7]" /></div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Users size={48} className="text-neutral-600 mb-4" />
            <p className="text-neutral-500 text-center">No groups yet — create one to start splitting expenses</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const cachedExpenses = getCachedExpenses(group.id);
              const net = calcNetBalances(cachedExpenses, [], privyUserId!);
              const totalOwed = net.filter((b) => b.fromUserId === privyUserId).reduce((s, b) => s + b.amount, 0);
              const totalOwing = net.filter((b) => b.toUserId === privyUserId).reduce((s, b) => s + b.amount, 0);
              let balanceText = "Settled up";
              let balanceColor = "text-neutral-500";
              if (totalOwed > 0.005) { balanceText = `You owe ${totalOwed.toFixed(2)}`; balanceColor = "text-red-400"; }
              else if (totalOwing > 0.005) { balanceText = `You're owed ${totalOwing.toFixed(2)}`; balanceColor = "text-green-400"; }

              return (
                <Link key={group.id} href={`/groups/${group.id}`} className="block bg-[#141414] hover:bg-[#1A1A1A] rounded-2xl p-4 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-base">{group.name}</p>
                      <p className="text-neutral-500 text-sm mt-0.5">{group.members.length} member{group.members.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`${balanceColor} text-sm font-medium`}>{balanceText}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* FAB */}
        <Link href="/groups/new" className="fixed bottom-8 right-6 bg-[#7B5EA7] hover:bg-[#6B4E97] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition">
          <Plus size={28} />
        </Link>
      </div>
    </div>
  );
}
```

---

## Category 6 — Yield & Earn (Web)

> **Goal**: Users can stake idle STRK to earn yield, set up DCA orders, deposit into lending pools, and view all earning positions in one screen.

### Context (Web)

- Identical business logic to mobile. The Starkzap SDK integration is platform-agnostic.
- `lib/txHistory.ts` uses **localStorage** instead of AsyncStorage.
- All types in `lib/earn.ts` are unchanged.
- All Zustand stores are unchanged.
- Screens use Next.js App Router pages with `"use client"` directives.

---

### 6.1 Types (`lib/earn.ts` — NEW)

Identical to mobile — no changes needed.

```typescript
import type { Address, Amount, Token } from "starkzap";

export interface StakerPool {
  poolContract: Address;
  token: Token;
  totalDelegated: Amount;
  validatorName: string;
  validatorLogoUrl: string | null;
  apyPercent: number | null;
  commissionPercent: number | null;
}

export interface StakedPosition {
  poolContract: Address;
  validatorName: string;
  staked: Amount;
  rewards: Amount;
  unpooling: Amount;
  unpoolTime: Date | null;
  commissionPercent: number;
}

export type DcaFrequencyOption = { label: string; value: string };

export interface AppDcaOrder {
  id: string;
  orderAddress: Address;
  sellToken: Token;
  buyToken: Token;
  sellAmountPerCycle: string;
  frequency: string;
  frequencyLabel: string;
  status: "ACTIVE" | "INDEXING" | "CLOSED";
  startDate: Date;
  endDate: Date;
  executedTradesCount: number;
  amountSold: string;
  amountBought: string;
}

export interface AppLendingPosition {
  poolId: Address;
  poolName: string;
  token: Token;
  depositedAmount: string;
  apyPercent: number | null;
  usdValue: string;
}
```

---

### 6.2 Staking Library (`lib/staking.ts` — NEW)

Identical to mobile — the SDK is consumed the same way.

```typescript
import { getSdk } from "@/lib/starkzap";
import { Amount } from "starkzap";
import type { OnboardResult } from "starkzap";
import type { Address, Token } from "starkzap";
import type { StakerPool, StakedPosition } from "@/lib/earn";
import { CURATED_VALIDATORS } from "@/constants/validators";

export async function getValidatorPools(): Promise<StakerPool[]> {
  const sdk = getSdk();
  const results = await Promise.allSettled(
    CURATED_VALIDATORS.map(async (v) => {
      const pools = await sdk.getStakerPools(v.stakerAddress);
      return pools.map((p): StakerPool => ({
        poolContract: p.poolContract, token: p.token, totalDelegated: p.amount,
        validatorName: v.name, validatorLogoUrl: v.logoUrl ?? null,
        apyPercent: null, commissionPercent: null,
      }));
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<StakerPool[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

export async function getStakedPositions(wallet: OnboardResult["wallet"], pools: StakerPool[]): Promise<StakedPosition[]> {
  const results = await Promise.allSettled(
    pools.map(async (p) => {
      const member = await wallet.getPoolPosition(p.poolContract);
      if (!member) return null;
      return { poolContract: p.poolContract, validatorName: p.validatorName, staked: member.staked, rewards: member.rewards, unpooling: member.unpooling, unpoolTime: member.unpoolTime ?? null, commissionPercent: member.commissionPercent } satisfies StakedPosition;
    })
  );
  return results.filter((r): r is PromiseFulfilledResult<StakedPosition | null> => r.status === "fulfilled").map((r) => r.value).filter((v): v is StakedPosition => v !== null);
}

export async function stakeInPool(onboard: OnboardResult, poolAddress: Address, amountStr: string, token: Token) {
  const amount = Amount.parse(amountStr, token);
  return onboard.wallet.tx().stake(poolAddress, amount).send();
}

export async function claimPoolRewards(onboard: OnboardResult, poolAddress: Address) {
  return onboard.wallet.tx().claimPoolRewards(poolAddress).send();
}

export async function beginUnstake(onboard: OnboardResult, poolAddress: Address, amountStr: string, token: Token) {
  const amount = Amount.parse(amountStr, token);
  return onboard.wallet.tx().exitPoolIntent(poolAddress, amount).send();
}

export async function finalizeUnstake(onboard: OnboardResult, poolAddress: Address) {
  return onboard.wallet.tx().exitPool(poolAddress).send();
}
```

---

### 6.3 DCA Library (`lib/dca.ts` — NEW)

Identical to mobile.

```typescript
import { Amount } from "starkzap";
import type { OnboardResult, DcaOrder } from "starkzap";
import type { Token, Address } from "starkzap";
import type { AppDcaOrder, DcaFrequencyOption } from "@/lib/earn";
import { TOKEN_BY_ADDRESS } from "@/constants/tokens";

export const DCA_FREQUENCY_OPTIONS: DcaFrequencyOption[] = [
  { label: "Every 12h", value: "PT12H" },
  { label: "Daily", value: "P1D" },
  { label: "Weekly", value: "P1W" },
];

export function frequencyToLabel(isoValue: string): string {
  return DCA_FREQUENCY_OPTIONS.find((o) => o.value === isoValue)?.label ?? isoValue;
}

function resolveToken(address: Address): Token {
  return TOKEN_BY_ADDRESS[address.toLowerCase()] ?? { address, symbol: address.slice(0, 8) + "…", name: "Unknown", decimals: 18 };
}

function mapOrder(o: DcaOrder): AppDcaOrder {
  const sellToken = resolveToken(o.sellTokenAddress);
  const buyToken = resolveToken(o.buyTokenAddress);
  return {
    id: o.id, orderAddress: o.orderAddress, sellToken, buyToken,
    sellAmountPerCycle: o.sellAmountPerCycleBase !== undefined ? Amount.fromRaw(o.sellAmountPerCycleBase, sellToken).toUnit().toString() : "—",
    frequency: o.frequency, frequencyLabel: frequencyToLabel(o.frequency),
    status: o.status as AppDcaOrder["status"],
    startDate: new Date(o.startDate), endDate: new Date(o.endDate),
    executedTradesCount: o.executedTradesCount ?? 0,
    amountSold: o.amountSoldBase ? Amount.fromRaw(o.amountSoldBase, sellToken).toUnit().toString() : "0",
    amountBought: o.amountBoughtBase ? Amount.fromRaw(o.amountBoughtBase, buyToken).toUnit().toString() : "0",
  };
}

export async function getActiveDcaOrders(onboard: OnboardResult): Promise<AppDcaOrder[]> {
  try { return (await onboard.wallet.dca().getOrders({ status: "ACTIVE" })).map(mapOrder); } catch { return []; }
}

export async function createDcaOrder(onboard: OnboardResult, params: { sellToken: Token; buyToken: Token; totalSellAmount: string; perCycleSellAmount: string; frequency: string }) {
  return onboard.wallet.tx().dcaCreate({
    sellToken: params.sellToken, buyToken: params.buyToken,
    sellAmount: Amount.parse(params.totalSellAmount, params.sellToken),
    sellAmountPerCycle: Amount.parse(params.perCycleSellAmount, params.sellToken),
    frequency: params.frequency,
  }).send();
}

export async function cancelDcaOrder(onboard: OnboardResult, orderId: string, orderAddress: Address) {
  return onboard.wallet.tx().dcaCancel({ orderId, orderAddress }).send();
}
```

---

### 6.4 Lending Library (`lib/lending.ts` — NEW)

Identical to mobile.

```typescript
import { Amount } from "starkzap";
import type { OnboardResult, LendingMarket, LendingUserPosition } from "starkzap";
import type { Token, Address } from "starkzap";
import type { AppLendingPosition } from "@/lib/earn";
import { formatUsdValue } from "@/lib/format";

export async function getLendingMarkets(onboard: OnboardResult): Promise<LendingMarket[]> {
  try { return await onboard.wallet.lending().getMarkets(); } catch { return []; }
}

export async function getLendingPositions(onboard: OnboardResult, markets: LendingMarket[]): Promise<AppLendingPosition[]> {
  try {
    const positions = await onboard.wallet.lending().getPositions();
    return positions.filter((p) => p.type === "earn").map((p: LendingUserPosition): AppLendingPosition => {
      const token = p.collateral.token;
      const rawAmount = p.collateral.amount ?? 0n;
      const deposited = Amount.fromRaw(rawAmount, token).toUnit().toString();
      const rawUsd = p.collateral.usdValue;
      const market = markets.find((m) => m.id === p.pool.id);
      const apyRaw = market?.stats?.supplyApy;
      const apyPercent = apyRaw != null ? parseFloat(Amount.fromRaw(apyRaw, { decimals: 16, symbol: "PCT", name: "", address: "0x0" }).toUnit().toString()) : null;
      return { poolId: p.pool.id, poolName: p.pool.name ?? p.pool.id.slice(0, 10) + "…", token, depositedAmount: deposited, apyPercent, usdValue: formatUsdValue(typeof rawUsd === "bigint" ? rawUsd : undefined) };
    });
  } catch { return []; }
}

export async function depositToLending(onboard: OnboardResult, token: Token, amountStr: string, poolAddress?: Address) {
  return onboard.wallet.tx().lendDeposit({ token, amount: Amount.parse(amountStr, token), ...(poolAddress ? { poolAddress } : {}) }).send();
}

export async function withdrawFromLending(onboard: OnboardResult, token: Token, amountStr: string, poolAddress?: Address) {
  return onboard.wallet.tx().lendWithdraw({ token, amount: Amount.parse(amountStr, token), ...(poolAddress ? { poolAddress } : {}) }).send();
}

export async function withdrawAllFromLending(onboard: OnboardResult, token: Token, poolAddress?: Address) {
  return onboard.wallet.tx().lendWithdrawMax({ token, ...(poolAddress ? { poolAddress } : {}) }).send();
}
```

---

### 6.5 Zustand Store, Hooks, Components

`stores/earn.ts`, `hooks/useStaking.ts`, `hooks/useDCA.ts`, `hooks/useLending.ts` — **all identical to mobile**. Zustand and React hooks are platform-agnostic.

### 6.6 Components (Web Rewrites)

All component rewrites follow the same pattern: replace React Native primitives with HTML equivalents + Tailwind CSS classes.

#### `components/PoolCard.tsx` (Web)

```tsx
"use client";

import { TrendingUp, Gift, ArrowDownToLine } from "lucide-react";
import type { StakerPool, StakedPosition } from "@/lib/earn";
import { formatBalance } from "@/lib/format";

export function PoolCard({ pool, position, onStake, onClaim, onUnstake }: {
  pool: StakerPool; position: StakedPosition | null;
  onStake: () => void; onClaim: () => void; onUnstake: () => void;
}) {
  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold">{pool.validatorName}</p>
          <p className="text-neutral-500 text-sm">Total: {formatBalance(pool.totalDelegated)} STRK</p>
        </div>
        <span className="text-neutral-400 text-sm">APY: —</span>
      </div>
      {position && (
        <div className="border-t border-[#222] pt-3 mt-3">
          <p className="text-sm">Your stake: {formatBalance(position.staked)} STRK</p>
          <p className="text-sm">Rewards: {formatBalance(position.rewards)} STRK</p>
          <div className="flex gap-2 mt-3">
            <button onClick={onClaim} disabled={position.rewards.isZero()} className="flex-1 bg-[#7B5EA7] hover:bg-[#6B4E97] disabled:opacity-40 rounded-lg py-2 text-sm font-medium transition">Claim Rewards</button>
            <button onClick={onUnstake} className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg py-2 text-sm font-medium transition">Unstake</button>
          </div>
        </div>
      )}
      {!position && (
        <button onClick={onStake} className="mt-3 w-full bg-[#7B5EA7] hover:bg-[#6B4E97] rounded-lg py-2 text-sm font-medium transition flex items-center justify-center gap-1">
          <TrendingUp size={16} /> Stake STRK
        </button>
      )}
    </div>
  );
}
```

#### `components/DcaOrderCard.tsx` (Web)

```tsx
"use client";

import { RefreshCw } from "lucide-react";
import type { AppDcaOrder } from "@/lib/earn";
import { frequencyToLabel } from "@/lib/dca";
import { Loader2 } from "lucide-react";

export function DcaOrderCard({ order, onCancel, cancelling }: { order: AppDcaOrder; onCancel: () => void; cancelling: boolean }) {
  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold">{order.sellToken.symbol} → {order.buyToken.symbol}</p>
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-sm">{order.frequencyLabel}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === "ACTIVE" ? "bg-green-900/40 text-green-400" : "bg-yellow-900/40 text-yellow-400"}`}>{order.status}</span>
        </div>
      </div>
      <p className="text-sm text-neutral-400">{order.sellAmountPerCycle} {order.sellToken.symbol} per cycle · {order.executedTradesCount} trades</p>
      <p className="text-sm text-neutral-400">Sold: {order.amountSold} {order.sellToken.symbol} / Bought: {order.amountBought} {order.buyToken.symbol}</p>
      <button onClick={onCancel} disabled={cancelling} className="mt-3 text-red-400 hover:text-red-300 text-sm flex items-center gap-1">
        {cancelling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Cancel Order
      </button>
    </div>
  );
}
```

#### `components/LendingMarketCard.tsx` (Web)

```tsx
"use client";

import type { AppLendingPosition } from "@/lib/earn";
import { Plus, ArrowDownToLine } from "lucide-react";

export function LendingMarketCard({ poolName, position, apyPercent, token, onDeposit, onWithdraw }: {
  poolName: string; position: AppLendingPosition | null; apyPercent: number | null;
  token: { symbol: string }; onDeposit: () => void; onWithdraw: () => void;
}) {
  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold">{token.symbol} — {poolName}</p>
        <span className="text-neutral-400 text-sm">APY: {apyPercent != null ? `${apyPercent}%` : "—"}</span>
      </div>
      {position && (
        <div className="border-t border-[#222] pt-3 mt-3">
          <p className="text-sm">Deposited: {position.depositedAmount} {token.symbol} <span className="text-neutral-500">{position.usdValue}</span></p>
          <div className="flex gap-2 mt-3">
            <button onClick={onDeposit} className="flex-1 bg-[#7B5EA7] hover:bg-[#6B4E97] rounded-lg py-2 text-sm font-medium transition">Deposit More</button>
            <button onClick={onWithdraw} className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg py-2 text-sm font-medium transition">Withdraw</button>
          </div>
        </div>
      )}
      {!position && (
        <button onClick={onDeposit} className="mt-3 w-full bg-[#7B5EA7] hover:bg-[#6B4E97] rounded-lg py-2 text-sm font-medium transition flex items-center justify-center gap-1">
          <Plus size={16} /> Deposit {token.symbol}
        </button>
      )}
    </div>
  );
}
```

---

### 6.7 Earn Hub Screen

#### `app/(app)/earn/page.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStaking } from "@/hooks/useStaking";
import { useDCA } from "@/hooks/useDCA";
import { useLending } from "@/hooks/useLending";
import { useEarnStore } from "@/stores/earn";
import { useAuthStore } from "@/stores/auth";
import { PoolCard } from "@/components/PoolCard";
import { DcaOrderCard } from "@/components/DcaOrderCard";
import { LendingMarketCard } from "@/components/LendingMarketCard";
import { Plus, Loader2 } from "lucide-react";
import { formatBalance } from "@/lib/format";

type EarnTab = "staking" | "dca" | "lending";

export default function EarnPage() {
  const [activeTab, setActiveTab] = useState<EarnTab>("staking");
  const { status } = useAuthStore();
  const { pools, stakedPositions, poolsLoading, poolsError, dcaOrders, dcaLoading, lendingPositions, lendingMarkets, lendingLoading } = useEarnStore();
  const { refetch: refetchStaking } = useStaking();
  const { refetch: refetchDca } = useDCA();
  const { refetch: refetchLending } = useLending();

  if (status !== "ready") return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[#7B5EA7]" /></div>;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-6">Earn</h1>

        {/* Tab toggle */}
        <div className="flex bg-[#141414] rounded-xl mb-4 p-1">
          {(["staking", "dca", "lending"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition ${activeTab === tab ? "bg-[#7B5EA7]" : "text-neutral-400"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "staking" && (
          <div>
            {poolsError && <div className="bg-red-900/30 text-red-400 rounded-xl p-3 mb-4 text-sm">{poolsError}</div>}
            {pools.map((pool) => (
              <PoolCard
                key={pool.poolContract}
                pool={pool}
                position={stakedPositions.find((p) => p.poolContract === pool.poolContract) ?? null}
                onStake={() => {}}
                onClaim={() => {}}
                onUnstake={() => {}}
              />
            ))}
            {pools.length === 0 && !poolsLoading && <p className="text-neutral-500 text-sm text-center py-8">No staking pools available</p>}
          </div>
        )}

        {activeTab === "dca" && (
          <div>
            {dcaOrders.map((order) => <DcaOrderCard key={order.id} order={order} onCancel={async () => {}} cancelling={false} />)}
            {dcaOrders.length === 0 && !dcaLoading && <p className="text-neutral-500 text-sm text-center py-8">No active DCA orders</p>}
            <button className="mt-4 w-full border border-dashed border-[#222] rounded-xl py-3 text-[#7B5EA7] hover:bg-[#141414] transition flex items-center justify-center gap-1">
              <Plus size={16} /> New DCA Order
            </button>
          </div>
        )}

        {activeTab === "lending" && (
          <div>
            {lendingMarkets.length === 0 && !lendingLoading && <p className="text-neutral-500 text-sm text-center py-8">Lending not available on testnet</p>}
            {lendingMarkets.map((market) => (
              <LendingMarketCard
                key={market.id}
                poolName={market.name ?? market.id.slice(0, 10) + "…"}
                position={lendingPositions.find((p) => p.poolId === market.id) ?? null}
                apyPercent={null}
                token={market.token}
                onDeposit={() => {}}
                onWithdraw={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 6.8 `lib/format.ts` Extension

```typescript
export function formatUsdValue(raw1e18: bigint | undefined): string {
  if (raw1e18 === undefined || raw1e18 === 0n) return "$—";
  const usd = Number(raw1e18) / 1e18;
  return `$${usd.toFixed(2)}`;
}
```

### 6.9 `lib/txHistory.ts` Extension

```typescript
export interface TxRecord {
  id: string;
  type: "send" | "receive" | "fund" | "withdraw" | "rollover" |
        "stake" | "unstake_intent" | "unstake" | "claim_rewards" |
        "dca_create" | "dca_cancel" | "lend_deposit" | "lend_withdraw";
  amount: string;
  token: string;
  counterparty: string;
  timestamp: number;
  txHash: string;
  isPrivate: boolean;
}
```

---

## Category 7 — UI/UX & Navigation (Web)

> **Goal**: A polished, consumer-grade web interface with design system, animations, skeleton loaders, and QR scanning.

### 7.1 Design System (`constants/ui.ts` — unchanged)

All design tokens (`COLORS`, `SPACING`, `RADIUS`, etc.) remain the same. They are referenced in both Tailwind classes (arbitrary values) and inline styles.

### 7.2 Font Loading (`app/layout.tsx` — Web)

Replace `expo-font` with `next/font/google`:

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SpiceUP",
  description: "Private payments on Starknet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-[#0D0D0D] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
```

In `globals.css` (Tailwind CSS 4):
```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --color-background: #0D0D0D;
  --color-surface: #141414;
  --color-surface-alt: #1A1A1A;
  --color-border: #222222;
  --color-accent: #7B5EA7;
  --color-accent-dim: #4A3870;
  --color-success: #4CAF50;
  --color-error: #EF4444;
}
```

### 7.3 Skeleton Loader (`components/Skeleton.tsx` — Web)

Replace `react-native-reanimated` with CSS animations:

```tsx
export function SkeletonBox({ width = "100%", height, borderRadius = 12 }: {
  width?: string | number; height: number; borderRadius?: number;
}) {
  return (
    <div
      className="animate-pulse bg-surface-alt rounded-lg"
      style={{ width: width as string, height, borderRadius }}
    />
  );
}

export function SkeletonText({ width = "70%", fontSize = 14, lines = 1 }: {
  width?: string; fontSize?: number; lines?: number;
}) {
  const lineHeight = Math.round(fontSize * 1.3);
  return (
    <div className="space-y-1.5">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 && lines > 1 ? "50%" : width}
          height={lineHeight}
          borderRadius={8}
        />
      ))}
    </div>
  );
}
```

### 7.4 PrivacyBadge (`components/PrivacyBadge.tsx` — Web)

```tsx
import { Lock } from "lucide-react";

export function PrivacyBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 bg-[#3B1F5C] text-[#C084FC] rounded-full font-medium ${cls}`}>
      <Lock size={size === "sm" ? 10 : 13} />
      Private
    </span>
  );
}
```

### 7.5 QR Code Generation (`components/QRCodeDisplay.tsx` — Web)

Replace native QR generation with `qrcode.react`:

```tsx
"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRCodeDisplay({ value, size = 200 }: { value: string; size?: number }) {
  return (
    <div className="bg-white p-4 rounded-2xl inline-block">
      <QRCodeSVG value={value} size={size} level="M" fgColor="#0D0D0D" bgColor="#ffffff" />
    </div>
  );
}
```

### 7.6 QR Scanner (`components/QRScanner.tsx` — Web)

Replace `expo-camera` with `html5-qrcode`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";

export type ScannedAddressType = "starknet" | "tongo" | "unknown";

export interface ScanResult {
  type: ScannedAddressType;
  value: string;
}

function parseAddress(raw: string): ScanResult {
  const trimmed = raw.trim();
  if (/^0x[0-9a-fA-F]{63,64}$/.test(trimmed)) return { type: "starknet", value: trimmed };
  if (/^[1-9A-HJ-NP-Za-km-z]{40,60}$/.test(trimmed)) return { type: "tongo", value: trimmed };
  return { type: "unknown", value: trimmed };
}

export function QRScanner({ onScan, onClose }: { onScan: (result: ScanResult) => void; onClose: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scanner = new Html5Qrcode("qr-scanner-region");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (!scanned) {
          setScanned(true);
          onScan(parseAddress(decodedText));
        }
      },
      () => {} // ignore errors during continuous scanning
    ).catch((err) => {
      setError("Camera access denied or not available.");
    });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-white"><X size={28} /></button>
        <span className="text-white font-medium">Scan QR Code</span>
        <div className="w-7" />
      </div>

      <div className="flex-1 flex items-center justify-center">
        {error ? (
          <div className="text-center px-8">
            <Camera size={48} className="text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400">{error}</p>
          </div>
        ) : (
          <div id="qr-scanner-region" ref={containerRef} className="w-[300px] h-[300px] rounded-2xl overflow-hidden" />
        )}
      </div>

      <div className="p-4 text-center">
        <p className="text-neutral-400 text-sm">Point at a Starknet address or SpiceUP private address</p>
        {scanned && (
          <button onClick={() => setScanned(false)} className="text-[#7B5EA7] text-sm mt-2">Tap to scan again</button>
        )}
      </div>
    </div>
  );
}
```

### 7.7 AddressDisplay (`components/AddressDisplay.tsx` — Web)

```tsx
"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export function AddressDisplay({ address, label, showShare = false, trimLength = 6 }: {
  address: string; label?: string; showShare?: boolean; trimLength?: number;
}) {
  const [copied, setCopied] = useState(false);
  const shorten = address.length <= trimLength * 2 + 3 ? address : `${address.slice(0, trimLength)}…${address.slice(-trimLength)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ text: address });
    } else {
      await handleCopy();
    }
  }

  return (
    <div className="bg-[#141414] rounded-xl px-4 py-3 flex items-center gap-2">
      {label && <span className="text-neutral-500 text-xs mr-1">{label}</span>}
      <span className="flex-1 text-neutral-400 text-sm font-mono tracking-wide truncate">{shorten}</span>
      <button onClick={handleCopy} className="hover:bg-[#1A1A1A] p-1 rounded transition">
        {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-neutral-500" />}
      </button>
      {showShare && (
        <button onClick={handleShare} className="hover:bg-[#1A1A1A] p-1 rounded transition">
          <Share2 size={18} className="text-neutral-500" />
        </button>
      )}
    </div>
  );
}
```

### 7.8 BalanceCard (`components/BalanceCard.tsx` — Web)

```tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Amount, Token } from "starkzap";
import { formatBalance, toFiat } from "@/lib/format";
import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export function BalanceCard({ token, balance, loading = false, onPress, compact = false }: {
  token: Token; balance: Amount | null; loading?: boolean; onPress?: () => void; compact?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const [showFiat, setShowFiat] = useState(true);

  if (loading) {
    return (
      <div className="bg-[#141414] p-4 rounded-xl mb-2 flex items-center justify-between">
        <div className="gap-1.5"><SkeletonText width={48} fontSize={13} /><SkeletonText width={80} fontSize={11} /></div>
        <SkeletonText width={72} fontSize={16} />
      </div>
    );
  }

  const primaryAmount = hidden ? "••••••" : showFiat ? toFiat(balance, token.symbol) : formatBalance(balance) + " " + token.symbol;
  const secondaryAmount = hidden ? "••••" : showFiat ? formatBalance(balance) + " " + token.symbol : toFiat(balance, token.symbol);

  return (
    <button onClick={onPress} className="w-full bg-[#141414] hover:bg-[#1A1A1A] p-4 rounded-xl mb-2 flex items-center justify-between transition text-left">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2A1F42] flex items-center justify-center">
          <span className="text-[#7B5EA7] font-bold text-xs">{token.symbol.slice(0, 2)}</span>
        </div>
        <div>
          <p className="font-semibold text-sm">{token.symbol}</p>
          <p className="text-neutral-500 text-xs">{token.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <button onClick={(e) => { e.stopPropagation(); setShowFiat((v) => !v); }} className="font-semibold text-base block">{primaryAmount}</button>
          <p className="text-neutral-500 text-xs">{secondaryAmount}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setHidden((v) => !v); }} className="text-neutral-500 hover:text-neutral-300">
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </button>
  );
}
```

### 7.9 TransactionItem (`components/TransactionItem.tsx` — Web)

```tsx
import { ArrowUpCircle, ArrowDownCircle, LockClosed, LockOpen, TrendingUp, TrendingDown, Clock, Gift, Wallet, Repeat, XCircle, CircleDot } from "lucide-react";
import type { TxRecord } from "@/lib/txHistory";
import { shortenAddress } from "@/lib/format";
import { PrivacyBadge } from "@/components/PrivacyBadge";

const TX_META: Record<TxRecord["type"], { label: string; direction: "out" | "in" | "neutral"; icon: React.ElementType }> = {
  send: { label: "Sent", direction: "out", icon: ArrowUpCircle },
  receive: { label: "Received", direction: "in", icon: ArrowDownCircle },
  fund: { label: "Funded", direction: "out", icon: LockClosed },
  withdraw: { label: "Withdrew", direction: "in", icon: LockOpen },
  stake: { label: "Staked", direction: "out", icon: TrendingUp },
  unstake: { label: "Unstaked", direction: "in", icon: TrendingDown },
  unstake_intent: { label: "Unstaking…", direction: "neutral", icon: Clock },
  claim_rewards: { label: "Claimed", direction: "in", icon: Gift },
  lend_deposit: { label: "Deposited", direction: "out", icon: Wallet },
  lend_withdraw: { label: "Withdrawn", direction: "in", icon: Wallet },
  dca_create: { label: "DCA Created", direction: "out", icon: Repeat },
  dca_cancel: { label: "DCA Cancelled", direction: "neutral", icon: XCircle },
};

const DIR_COLOR = { out: "text-red-400", in: "text-green-400", neutral: "text-neutral-400" };
const PREFIX = { out: "−", in: "+", neutral: "" };

export function TransactionItem({ tx }: { tx: TxRecord }) {
  const meta = TX_META[tx.type] ?? { label: tx.type, direction: "neutral" as const, icon: CircleDot };
  const Icon = meta.icon;
  return (
    <div className="flex items-center py-3 border-b border-[#222] gap-3">
      <div className="w-[38px] h-[38px] rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
        <Icon size={18} className={DIR_COLOR[meta.direction]} />
      </div>
      <div className="flex-1 min-w-0 gap-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{meta.label}</span>
          {tx.isPrivate && <PrivacyBadge size="sm" />}
        </div>
        {tx.counterparty && <p className="text-neutral-500 text-xs truncate">{shortenAddress(tx.counterparty)}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-semibold text-sm ${DIR_COLOR[meta.direction]}`}>{PREFIX[meta.direction]}{tx.amount} {tx.token}</p>
        <p className="text-neutral-600 text-xs">{new Date(tx.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
      </div>
    </div>
  );
}
```

### 7.10 Framer Motion Animations (`components/AnimatedCard.tsx` — NEW)

Replace `react-native-reanimated` with `framer-motion`:

```tsx
"use client";

import { motion } from "framer-motion";

export function AnimatedCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay }}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {children}
    </motion.div>
  );
}
```

### 7.11 Toast Component (`components/Toast.tsx` — Web)

```tsx
"use client";

import { useToastStore } from "@/stores/toast";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { visible, message, variant } = useToastStore();

  return (
    <>
      {children}
      <AnimatePresence>
        {visible && message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] border border-[#222] rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg"
          >
            {variant === "error" && <AlertCircle size={18} className="text-red-400" />}
            {variant === "success" && <CheckCircle size={18} className="text-green-400" />}
            {variant === "info" && <Info size={18} className="text-neutral-400" />}
            <span className="text-white text-sm">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

---

## Category 8 — Testing & Deployment (Web)

> **Goal**: Verified on Sepolia testnet, then shipped via Vercel.

### Context (Web)

- No Jest/React Native test setup needed — use **Vitest** instead.
- No `expo-cli`, no `eas.json`, no native build profiles.
- Deployment is standard Next.js: `next build` → Vercel.
- All `EXPO_PUBLIC_*` env vars become `NEXT_PUBLIC_*`.
- No native module mocks needed (no SecureStore, AsyncStorage, SQLite, expo-crypto).
- `localStorage` is available globally in both browser and Node test env.

---

### 8.1 Unit Tests with Vitest

#### Install

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

#### `vitest.config.ts` (NEW)

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

#### `__tests__/setup.ts` (NEW)

```typescript
import "@testing-library/jest-dom/vitest";

// Mock localStorage
const store = new Map<string, string>();
const originalGetItem = localStorage.getItem.bind(localStorage);
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);

beforeEach(() => {
  store.clear();
  localStorage.getItem = (key: string) => store.get(key) ?? null;
  localStorage.setItem = (key: string, value: string) => store.set(key, value);
  localStorage.removeItem = (key: string) => store.delete(key);
  localStorage.clear = () => store.clear();
});

afterAll(() => {
  localStorage.getItem = originalGetItem;
  localStorage.setItem = originalSetItem;
  localStorage.removeItem = originalRemoveItem;
  localStorage.clear = originalClear;
});

// Mock Web Crypto API for phone hashing tests
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: {
      digest: async (algo: string, data: Uint8Array) => {
        // Simple deterministic hash for tests
        const hash = Array.from(data).reduce((h, b) => ((h << 5) - h + b) | 0, 0);
        const buf = new ArrayBuffer(32);
        const view = new DataView(buf);
        view.setUint32(0, hash >>> 0, false);
        return buf;
      },
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = (i * 7 + 13) % 256;
      return arr;
    },
  },
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: async () => {},
    readText: async () => "",
  },
});

// Environment variables
process.env.NEXT_PUBLIC_NETWORK = "sepolia";
process.env.NEXT_PUBLIC_PRIVY_APP_ID = "test_privy_app_id";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test_supabase_key";
```

#### `__tests__/lib/tongo.test.ts`

Identical test cases to mobile, but `localStorage` replaces `expo-secure-store`:

```typescript
import { describe, it, expect } from "vitest";
import { parseTongoQr, isValidTongoAddress } from "@/lib/tongo";

describe("parseTongoQr", () => {
  it('parses valid "tongo:x:y" format', () => {
    expect(parseTongoQr("tongo:123:456")).toEqual({ x: 123n, y: 456n });
  });
  it("parses large bigint values", () => {
    expect(parseTongoQr("tongo:999999999999999999:888888888888888888")).toEqual({ x: 999999999999999999n, y: 888888888888888888n });
  });
  it("returns null for invalid prefix", () => { expect(parseTongoQr("notongo:1:2")).toBeNull(); });
  it("returns null for missing y coordinate", () => { expect(parseTongoQr("tongo:1")).toBeNull(); });
  it("returns null for empty string", () => { expect(parseTongoQr("")).toBeNull(); });
  it("returns null for non-numeric coordinates", () => { expect(parseTongoQr("tongo:abc:def")).toBeNull(); });
});

describe("isValidTongoAddress", () => {
  it("returns true for valid tongo addresses", () => { expect(isValidTongoAddress("tongo:123:456")).toBe(true); });
  it("returns false for invalid formats", () => {
    expect(isValidTongoAddress("")).toBe(false);
    expect(isValidTongoAddress("0x1234")).toBe(false);
    expect(isValidTongoAddress("tongo:abc:def")).toBe(false);
  });
});
```

#### `__tests__/lib/groups.test.ts`

Identical to mobile — `calcNetBalances` is pure logic:

```typescript
import { describe, it, expect } from "vitest";
import { calcNetBalances, type Expense, type Settlement } from "@/lib/groups";

const SELF = "user-A";

function makeExpense(overrides: Partial<Expense> & Pick<Expense, "paidBy" | "amount" | "splits">): Expense {
  return { id: Math.random().toString(36), groupId: "group-1", token: "STRK", description: "Test", settledBy: [], createdAt: Date.now(), ...overrides };
}
function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, "fromUserId" | "toUserId" | "amount">): Settlement {
  return { id: Math.random().toString(36), groupId: "group-1", token: "STRK", txHash: null, isPrivate: false, createdAt: Date.now(), ...overrides };
}

describe("calcNetBalances", () => {
  it("two-person equal split: B owes A half", () => {
    const expenses = [makeExpense({ paidBy: SELF, amount: "20", splits: [{ userId: SELF, amount: "10" }, { userId: "user-B", amount: "10" }] })];
    const result = calcNetBalances(expenses, [], SELF);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ fromUserId: "user-B", toUserId: SELF, amount: 10, token: "STRK" });
  });
  it("settlements reduce balances", () => {
    const expenses = [makeExpense({ paidBy: SELF, amount: "20", splits: [{ userId: SELF, amount: "10" }, { userId: "user-B", amount: "10" }] })];
    const settlements = [makeSettlement({ fromUserId: "user-B", toUserId: SELF, amount: "10" })];
    expect(calcNetBalances(expenses, settlements, SELF)).toHaveLength(0);
  });
  it("multiple expenses: net balances correct", () => {
    const expenses = [
      makeExpense({ paidBy: SELF, amount: "20", splits: [{ userId: SELF, amount: "10" }, { userId: "user-B", amount: "10" }] }),
      makeExpense({ paidBy: "user-B", amount: "30", splits: [{ userId: SELF, amount: "15" }, { userId: "user-B", amount: "15" }] }),
    ];
    const result = calcNetBalances(expenses, [], SELF);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5);
  });
  it("filters to only balances involving selfId", () => {
    const expenses = [makeExpense({ paidBy: "user-B", amount: "20", splits: [{ userId: "user-B", amount: "10" }, { userId: "user-C", amount: "10" }] })];
    expect(calcNetBalances(expenses, [], SELF)).toHaveLength(0);
  });
  it("returns empty for empty expenses", () => { expect(calcNetBalances([], [], SELF)).toEqual([]); });
});
```

#### `__tests__/lib/txHistory.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { getTxHistory, saveTx, clearHistory, type TxRecord } from "@/lib/txHistory";

function makeTx(overrides?: Partial<TxRecord>): TxRecord {
  return { id: Math.random().toString(36), type: "send", amount: "1.0", token: "STRK", counterparty: "0xabc", timestamp: Date.now(), txHash: "0xhash", isPrivate: false, ...overrides };
}

describe("txHistory", () => {
  it("saves and retrieves records", async () => {
    const tx = makeTx({ amount: "5.0" });
    await saveTx(tx);
    const history = await getTxHistory();
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe("5.0");
  });
  it("maintains newest-first ordering", async () => {
    await saveTx(makeTx({ amount: "1.0", timestamp: 1000 }));
    await saveTx(makeTx({ amount: "2.0", timestamp: 2000 }));
    const history = await getTxHistory();
    expect(history[0].amount).toBe("2.0");
  });
  it("caps at 200 records", async () => {
    for (let i = 0; i < 201; i++) await saveTx(makeTx({ amount: `${i}` }));
    expect((await getTxHistory()).length).toBe(200);
  });
  it("clears all records", async () => {
    await saveTx(makeTx());
    await clearHistory();
    expect(await getTxHistory()).toEqual([]);
  });
});
```

#### `__tests__/stores/*.test.ts`

All Zustand store tests are **identical** to mobile — they test `getState()` / `setState()` without React rendering.

#### `__tests__/lib/dca.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { frequencyToLabel, DCA_FREQUENCY_OPTIONS } from "@/lib/dca";

describe("DCA_FREQUENCY_OPTIONS", () => {
  it("has correct entries", () => {
    expect(DCA_FREQUENCY_OPTIONS).toEqual([
      { label: "Every 12h", value: "PT12H" },
      { label: "Daily", value: "P1D" },
      { label: "Weekly", value: "P1W" },
    ]);
  });
});

describe("frequencyToLabel", () => {
  it('maps known frequencies', () => {
    expect(frequencyToLabel("PT12H")).toBe("Every 12h");
    expect(frequencyToLabel("P1D")).toBe("Daily");
    expect(frequencyToLabel("P1W")).toBe("Weekly");
  });
  it("returns raw value for unknown", () => {
    expect(frequencyToLabel("P2W")).toBe("P2W");
  });
});
```

#### `__tests__/lib/format.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { formatUsdValue } from "@/lib/format";

describe("formatUsdValue", () => {
  it('returns "$—" for undefined', () => { expect(formatUsdValue(undefined)).toBe("$—"); });
  it('returns "$—" for 0n', () => { expect(formatUsdValue(0n)).toBe("$—"); });
  it("formats 1e18-scaled values", () => {
    expect(formatUsdValue(1_500_000_000_000_000_000n)).toBe("$1.50");
    expect(formatUsdValue(1_234_560_000_000_000_000_000n)).toBe("$1234.56");
  });
});
```

#### `package.json` Script Additions

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Deployment (Web — Vercel)

### Overview

SpiceUP Web is a standard Next.js 15 app. No native builds, no EAS, no app store submissions. Deploy to Vercel (or any Node.js host).

### Why Vercel (No EAS Build)

| Mobile Concern | Web Status |
|---|---|
| `expo-secure-store` native module | ✅ Replaced by `localStorage` |
| `expo-sqlite` native module | ✅ Replaced by `localStorage` |
| `expo-crypto` native module | ✅ Replaced by Web Crypto API |
| `expo-camera` native module | ✅ Replaced by `html5-qrcode` |
| `react-native-reanimated` | ✅ Replaced by `framer-motion` |
| `expo-font` / TTF assets | ✅ Replaced by `next/font/google` |
| `expo-clipboard` | ✅ Replaced by `navigator.clipboard` |
| `NativeWind` | ✅ Replaced by Tailwind CSS 4 |
| `Ionicons` | ✅ Replaced by `lucide-react` |
| EAS Build / app stores | ✅ `next build` + Vercel |

### Environment Variables

```bash
# .env.local (Vercel → Settings → Environment Variables)
NEXT_PUBLIC_NETWORK=sepolia          # or "mainnet"
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_STARKZAP_API_KEY=your_sdk_key  # if applicable
```

### Vercel Deployment

**One-time setup:**
```bash
npm install -g vercel
vercel login
```

**Deploy:**
```bash
# From project root
vercel

# Or link to existing project
vercel --link spiceup-web

# Production deployment
vercel --prod
```

**Or via GitHub integration:**
1. Push to GitHub
2. Import repo in Vercel dashboard
3. Set environment variables in Vercel settings
4. Vercel auto-deploys on push to `main`

### Build Configuration

Vercel auto-detects Next.js. No special config needed. For custom settings:

```json
// vercel.json (optional)
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

### Cost Summary

| Item | Cost |
|---|---|
| Vercel (Hobby) | **Free** |
| Vercel (Pro) | $20/month |
| Supabase (Free tier) | **Free** |
| Custom domain | ~$10/year |
| **Total (MVP)** | **$0** (free tier) |

### Pre-Deployment Checklist

- [ ] All `EXPO_PUBLIC_*` env vars renamed to `NEXT_PUBLIC_*`
- [ ] `next build` succeeds locally with no errors
- [ ] `vitest` passes all tests
- [ ] Supabase tables created and Realtime enabled
- [ ] Privy app configured for web (not just mobile)
- [ ] Starkzap SDK works in browser environment
- [ ] `html5-qrcode` camera scanning tested in Chrome/Safari
- [ ] QR generation tested with `qrcode.react`
- [ ] `localStorage` persistence tested (no data loss on refresh)
- [ ] Mobile-responsive layout verified

---

## Files Modified / Created (Web Summary)

| File | Action | Category |
|---|---|---|
| `lib/supabase.ts` | NEW | 5 |
| `lib/groups.ts` | NEW | 5 |
| `lib/groupsCache.ts` | NEW (localStorage) | 5 |
| `lib/resolver.ts` | NEW (Web Crypto) | 5 |
| `lib/earn.ts` | NEW | 6 |
| `lib/staking.ts` | NEW | 6 |
| `lib/dca.ts` | NEW | 6 |
| `lib/lending.ts` | NEW | 6 |
| `lib/format.ts` | EXTEND | 6 |
| `stores/groups.ts` | NEW | 5 |
| `stores/earn.ts` | NEW | 6 |
| `hooks/useGroups.ts` | NEW | 5 |
| `hooks/useGroupExpenses.ts` | NEW | 5 |
| `hooks/useStaking.ts` | NEW | 6 |
| `hooks/useDCA.ts` | NEW | 6 |
| `hooks/useLending.ts` | NEW | 6 |
| `components/PoolCard.tsx` | NEW | 6 |
| `components/DcaOrderCard.tsx` | NEW | 6 |
| `components/LendingMarketCard.tsx` | NEW | 6 |
| `components/PrivacyBadge.tsx` | NEW | 7 |
| `components/BalanceCard.tsx` | REWRITE | 7 |
| `components/TransactionItem.tsx` | REWRITE | 7 |
| `components/Skeleton.tsx` | NEW | 7 |
| `components/AddressDisplay.tsx` | NEW | 7 |
| `components/QRScanner.tsx` | NEW (html5-qrcode) | 7 |
| `components/QRCodeDisplay.tsx` | NEW (qrcode.react) | 7 |
| `components/AnimatedCard.tsx` | NEW (framer-motion) | 7 |
| `components/Toast.tsx` | NEW | 7 |
| `app/layout.tsx` | NEW (next/font) | 7 |
| `app/(app)/groups/page.tsx` | NEW | 5 |
| `app/(app)/groups/new/page.tsx` | NEW | 5 |
| `app/(app)/groups/[id]/page.tsx` | NEW | 5 |
| `app/(app)/groups/[id]/add-expense/page.tsx` | NEW | 5 |
| `app/join/page.tsx` | NEW | 5 |
| `app/(app)/earn/page.tsx` | NEW | 6 |
| `constants/ui.ts` | NEW | 7 |
| `constants/validators.ts` | NEW | 6 |
| `constants/tokens.ts` | EXTEND | 6 |
| `vitest.config.ts` | NEW | 8 |
| `__tests__/setup.ts` | NEW | 8 |
| `__tests__/lib/tongo.test.ts` | NEW | 8 |
| `__tests__/lib/groups.test.ts` | NEW | 8 |
| `__tests__/lib/txHistory.test.ts` | NEW | 8 |
| `__tests__/lib/dca.test.ts` | NEW | 8 |
| `__tests__/lib/format.test.ts` | NEW | 8 |
| `__tests__/stores/*.test.ts` | NEW (5 files) | 8 |
| `__tests__/constants/tokens.test.ts` | NEW | 8 |

---

## Supabase Setup Notes

Before running Categories 5–8 on the web:

1. Create a project at `supabase.com`
2. Run the full SQL schema from section 5.1 in the Supabase SQL editor
3. In `.env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Enable Realtime for `expenses` and `settlements` tables: **Supabase Dashboard → Database → Replication → toggle on**
5. MVP skips RLS — add RLS policies before mainnet deployment
