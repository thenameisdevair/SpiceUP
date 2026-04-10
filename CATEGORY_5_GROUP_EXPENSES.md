# Category 5 — Group Expenses (Detailed Plan)

> **Goal**: Users can create groups, add shared expenses, and privately settle balances.

---

## Context

- Categories 1–4 complete: Privy auth, Starknet wallet, public/private transfers, fund/withdraw all working.
- `useAuthStore` has `privyUserId`, `starknetAddress`, `tongoRecipientId`, `wallet`, `tongo`.
- `lib/tongo.ts` exports `sendPrivate()` (confidential transfer helper) and public send is handled by `app/(app)/send.tsx`.
- `lib/txHistory.ts` stores `TxRecord` to AsyncStorage (200-record cap, newest-first).
- Supabase env vars pre-configured in `.env.example` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — `@supabase/supabase-js` already in `package.json`.
- `expo-sqlite` already in `package.json` (offline cache ready).
- This category adds group/expense/settlement data layer on top of that foundation.

---

## 5.1 Data Model

> PRD: `Group`, `Expense`, `Settlement` entities with member arrays and settlement tracking.

### TypeScript Types (`lib/groups.ts` — NEW)

```typescript
export interface GroupMember {
  userId: string;          // Privy user ID (or phone hash for invited-but-not-joined)
  tongoId: string | null;  // "tongo:<x>:<y>" format — null if not yet onboarded
  starknetAddress: string | null;
  displayName: string;     // Phone number (formatted) or "You"
  phoneHash: string | null;
}

export interface Group {
  id: string;              // UUID
  name: string;
  members: GroupMember[];
  createdAt: number;       // epoch ms
}

export interface ExpenseSplit {
  userId: string;
  amount: string;          // human-readable share (e.g. "3.33")
}

export interface Expense {
  id: string;              // UUID
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

// Net balance result — who owes whom
export interface NetBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;          // always positive
  token: string;           // token of the group's primary token
}
```

### Supabase Database Schema

```sql
-- User phone registry (populated on phone screen in Cat 2)
CREATE TABLE user_profiles (
  privy_user_id TEXT PRIMARY KEY,
  phone_hash TEXT UNIQUE,           -- SHA-256 of E.164 phone
  starknet_address TEXT,
  tongo_id TEXT,                    -- "tongo:<x>:<y>"
  display_name TEXT,                -- formatted phone
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id TEXT NOT NULL,         -- privy_user_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members (fan-out per member so RLS is simple)
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,            -- privy_user_id or phone_hash (for invited)
  tongo_id TEXT,
  starknet_address TEXT,
  display_name TEXT NOT NULL,
  phone_hash TEXT,
  UNIQUE(group_id, user_id)
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  paid_by TEXT NOT NULL,            -- user_id
  amount TEXT NOT NULL,
  token TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense splits (one row per member per expense)
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  settled BOOLEAN DEFAULT FALSE
);

-- Settlements
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

-- Invite tokens (for deep link group joining)
CREATE TABLE group_invites (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ             -- NULL = still valid
);

-- Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Users can only see/write groups they belong to
CREATE POLICY "member_access" ON groups
  USING (id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

-- Same pattern for all child tables (group_id check via subquery)
```

> **Auth bridge**: Supabase `auth.uid()` won't match Privy user IDs directly. Simpler MVP path: use Supabase **anon key** + pass `privyUserId` explicitly in all queries (no RLS enforcement). Add proper RLS in Cat 8 after schema is stable and before mainnet.

---

## 5.2 Storage Strategy

> PRD: Supabase for cross-device sync, local SQLite cache for offline reads and optimistic UI.

### `lib/supabase.ts` (NEW)

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Singleton — imported everywhere groups/expenses are read or written.

### `lib/groups.ts` (NEW)

Contains all Supabase CRUD + net balance calculation. Key exports:

```typescript
import { supabase } from "./supabase";

// --- Groups ---

export async function createGroup(
  name: string,
  members: GroupMember[],
  creatorId: string
): Promise<Group> {
  // 1. INSERT into groups → get UUID
  // 2. INSERT all members into group_members (fan-out)
  // 3. Return assembled Group object
}

export async function getGroups(userId: string): Promise<Group[]> {
  // SELECT groups JOIN group_members WHERE group_members.user_id = userId
  // Assembles each group with its members array
}

export async function getGroup(groupId: string): Promise<Group | null> {
  // SELECT group + members for a single group
}

// --- Members ---

export async function addMember(groupId: string, member: GroupMember): Promise<void> {
  // UPSERT into group_members (UNIQUE constraint on group_id + user_id)
}

export async function resolveInvite(
  groupId: string,
  inviteToken: string
): Promise<Group | null> {
  // SELECT from group_invites WHERE token = inviteToken AND group_id = groupId AND used_at IS NULL
  // If valid: UPDATE used_at = NOW(), then call getGroup()
  // Returns null if token not found or already used
}

// --- Expenses ---

export async function addExpense(
  expense: Omit<Expense, "id" | "createdAt" | "settledBy">
): Promise<Expense> {
  // INSERT into expenses → get UUID
  // INSERT all splits into expense_splits
  // Return assembled Expense
}

export async function getExpenses(groupId: string): Promise<Expense[]> {
  // SELECT expenses + expense_splits WHERE group_id = groupId
  // Newest first (ORDER BY created_at DESC)
}

// --- Settlements ---

export async function recordSettlement(
  s: Omit<Settlement, "id" | "createdAt">
): Promise<Settlement> {
  // INSERT into settlements
  // Mark relevant expense_splits.settled = true
  //   (splits where user_id = s.fromUserId, expense is in this group, amount matches)
}

export async function getSettlements(groupId: string): Promise<Settlement[]> {
  // SELECT settlements WHERE group_id = groupId
}

// --- Net Balance Calculation (pure — no DB call) ---

export function calcNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  selfId: string
): NetBalance[] {
  // 1. Build raw balances map: userId → number
  //    positive = is owed money, negative = owes money
  const raw: Record<string, number> = {};

  for (const exp of expenses) {
    const total = parseFloat(exp.amount);
    raw[exp.paidBy] = (raw[exp.paidBy] ?? 0) + total;
    for (const split of exp.splits) {
      raw[split.userId] = (raw[split.userId] ?? 0) - parseFloat(split.amount);
    }
  }

  // 2. Apply already-settled settlements (reduce net debt)
  for (const s of settlements) {
    raw[s.fromUserId] = (raw[s.fromUserId] ?? 0) + parseFloat(s.amount);
    raw[s.toUserId]   = (raw[s.toUserId]   ?? 0) - parseFloat(s.amount);
  }

  // 3. Greedy creditor/debtor matching (minimum-transactions algorithm)
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

  // 4. Filter to only balances involving the current user
  return result.filter(b => b.fromUserId === selfId || b.toUserId === selfId);
}
```

### Local SQLite cache — `lib/groupsCache.ts` (NEW)

```typescript
import * as SQLite from "expo-sqlite";
import type { Group, Expense } from "./groups";

const db = SQLite.openDatabaseSync("spiceup_groups.db");

export function initGroupsDb(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cached_groups (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      data TEXT NOT NULL,
      synced_at INTEGER NOT NULL
    );
  `);
}

export function cacheGroups(groups: Group[]): void {
  const now = Date.now();
  for (const g of groups) {
    db.runSync(
      "INSERT OR REPLACE INTO cached_groups (id, data, synced_at) VALUES (?, ?, ?)",
      [g.id, JSON.stringify(g), now]
    );
  }
}

export function cacheExpenses(groupId: string, expenses: Expense[]): void {
  const now = Date.now();
  for (const e of expenses) {
    db.runSync(
      "INSERT OR REPLACE INTO cached_expenses (id, group_id, data, synced_at) VALUES (?, ?, ?, ?)",
      [e.id, groupId, JSON.stringify(e), now]
    );
  }
}

export function getCachedGroups(): Group[] {
  const rows = db.getAllSync<{ data: string }>("SELECT data FROM cached_groups ORDER BY synced_at DESC");
  return rows.map(r => JSON.parse(r.data) as Group);
}

export function getCachedExpenses(groupId: string): Expense[] {
  const rows = db.getAllSync<{ data: string }>(
    "SELECT data FROM cached_expenses WHERE group_id = ? ORDER BY synced_at DESC",
    [groupId]
  );
  return rows.map(r => JSON.parse(r.data) as Expense);
}
```

Call `initGroupsDb()` once in root `_layout.tsx` (inside a `useEffect`) alongside existing SDK init.

### `stores/groups.ts` (NEW — Zustand)

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

### `hooks/useGroups.ts` (NEW)

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
    // Serve cache first for instant render
    const cached = getCachedGroups();
    if (cached.length > 0) setGroups(cached);

    setLoading(true);
    try {
      const fresh = await getGroups(privyUserId);
      setGroups(fresh);
      cacheGroups(fresh);
    } catch (e) {
      setError((e as Error).message);
      // Cache already served above — no blank state on error
    } finally {
      setLoading(false);
    }
  }, [privyUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { groups, refresh: fetch };
}
```

### `hooks/useGroupExpenses.ts` (NEW)

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
    // Serve cache first
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

## 5.3 Create Group Flow

> PRD: Name the group, add members (phone search or paste Tongo address), share invite deep link.

### `lib/resolver.ts` (NEW)

```typescript
import { supabase } from "./supabase";
import * as Crypto from "expo-crypto";
import type { GroupMember } from "./groups";

async function hashPhone(phone: string): Promise<string> {
  // Normalize to E.164 before hashing (strip spaces, ensure +countrycode)
  const normalized = phone.replace(/\s/g, "");
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
}

// Resolve phone number → GroupMember
// Returns null if user has not registered in SpiceUP yet
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

// Register/update current user's profile in Supabase
// Call this from hooks/useAuthInit.ts after phone is verified
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

> **Extension point in `hooks/useAuthInit.ts`**: After phone OTP is verified and `setIdentity()` is called, add `await registerProfile(privyUserId, phone, starknetAddress, tongoId)`. This keeps the resolver table always fresh.

### `app/(app)/group/new.tsx` (NEW)

Stage machine: `"naming" → "adding_members" → "creating" → "done"`

```typescript
type Stage = "naming" | "adding_members" | "creating" | "done";

// State:
// - stage: Stage
// - groupName: string
// - members: GroupMember[]  (starts with self)
// - phoneQuery: string
// - phoneResult: GroupMember | null | "not_found" | "searching"
// - createdGroup: Group | null
```

**Stage `"naming"`**:
- `TextInput` for group name (min 2 chars, trim whitespace)
- "Next" button → advances to `"adding_members"` (disabled when name < 2 chars)

**Stage `"adding_members"`**:

Members chip row at top (horizontal `ScrollView`):
```tsx
{members.map(m => (
  <View key={m.userId} className="flex-row items-center bg-neutral-800 rounded-full px-3 py-1 mr-2">
    <Text className="text-white text-sm">{m.displayName}</Text>
    {m.userId !== privyUserId && (
      <Pressable onPress={() => removeMember(m.userId)}>
        <Ionicons name="close" size={14} color="#9ca3af" />
      </Pressable>
    )}
  </View>
))}
```

Phone search input (with 500ms debounce):
```typescript
// On change → setPhoneQuery → debounced resolvePhone call
// Results:
//   GroupMember found → show member card + "Add" button (purple)
//   null → "Not on SpiceUP yet — they can join via invite link" + grey "Add anyway"
//           "Add anyway" stores { userId: hash, tongoId: null, starknetAddress: null,
//                                  displayName: phone, phoneHash: hash }
```

"Paste Tongo address" toggle below search:
- `TextInput` accepting `tongo:<x>:<y>` format
- Validated with `parseTongoQr()` from `lib/tongo.ts`
- If valid: member added with `{ userId: uuid(), tongoId: input, starknetAddress: null, displayName: shortenAddress(input) }`
- If invalid: `Alert.alert("Invalid address", "Enter a valid Tongo address in tongo:<x>:<y> format")`

"Create Group" button (disabled when `members.length < 2`):
- Advances to `"creating"`

**Stage `"creating"`**:
```typescript
const group = await createGroup(groupName, members, privyUserId!);
// On success → set createdGroup, advance to "done"
// On error → Alert.alert("Failed to create group", e.message) → back to "adding_members"
```
Shows `<ActivityIndicator color="#7B5EA7" />` + "Creating group..."

**Stage `"done"`**:
```typescript
// Generate invite link
const inviteUrl = `spiceup://join?groupId=${group.id}&token=${group.inviteToken}`;
// Invite token is generated during createGroup() and stored in group_invites table

<Pressable onPress={() => Share.share({ message: `Join my SpiceUP group "${group.name}": ${inviteUrl}` })}>
  <Text>Share Invite Link</Text>
</Pressable>

<Pressable onPress={() => router.replace(`/(app)/group/${group.id}`)}>
  <Text>Open Group</Text>
</Pressable>
```

### Deep link invite — `app/index.tsx` (EXTEND)

```typescript
import { useLocalSearchParams, router } from "expo-router";
import { resolveInvite } from "@/lib/groups";
import { addMember } from "@/lib/groups";
import { useAuthStore } from "@/stores/auth";

// In the root redirect component, check for invite params:
const { groupId, token } = useLocalSearchParams<{ groupId?: string; token?: string }>();

useEffect(() => {
  if (groupId && token && privyUserId) {
    resolveInvite(groupId, token).then(group => {
      if (!group) {
        Alert.alert("Invalid invite link", "This invite has expired or is not valid.");
        return;
      }
      // Add current user to group if not already a member
      const alreadyMember = group.members.some(m => m.userId === privyUserId);
      if (!alreadyMember) {
        addMember(groupId, {
          userId: privyUserId,
          tongoId: `tongo:${tongoRecipientId!.x}:${tongoRecipientId!.y}`,
          starknetAddress,
          displayName: "Me",
          phoneHash: null,
        });
      }
      router.replace(`/(app)/group/${groupId}`);
    });
  }
}, [groupId, token, privyUserId]);
```

Configure scheme in `app.json`:
```json
{
  "expo": {
    "scheme": "spiceup",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "spiceup" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

## 5.4 Add Expense Flow

> PRD: Who paid, amount + description, split method (equal default / custom), creates Expense record.

### `app/(app)/group/add-expense.tsx` (NEW)

Receives `groupId` via Expo Router params:
```typescript
const { groupId } = useLocalSearchParams<{ groupId: string }>();
```
Loads the group from `useGroupsStore` (already fetched by `useGroups` hook).

Stage machine: `"input" → "reviewing" → "saving" → "done"`

**Stage `"input"`**:

Who paid — horizontal chip selector:
```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {group.members.map(m => (
    <Pressable
      key={m.userId}
      onPress={() => setPayer(m.userId)}
      className={`px-4 py-2 rounded-full mr-2 ${payer === m.userId ? "bg-purple-700" : "bg-neutral-800"}`}
    >
      <Text className="text-white">{m.displayName}</Text>
    </Pressable>
  ))}
</ScrollView>
```
Default payer: `privyUserId`.

Amount and description:
```tsx
<AmountInput
  value={amount}
  onChangeValue={setAmount}
  token={token}
  onChangeToken={setToken}
/>
<TextInput
  placeholder="What's this for? (e.g. Pizza)"
  value={description}
  onChangeText={setDescription}
  className="bg-neutral-800 text-white rounded-xl px-4 py-3 mt-4"
/>
```

Split toggle + breakdown:
```tsx
// Toggle: Equal | Custom
// Equal split: show calculated per-member amounts (read-only)
// Custom: per-member TextInput for amount
//   Running total shown: "12.00 / 30.00 USDC assigned"
//   Error shown if total ≠ expense amount: "Splits must sum to 30.00 USDC"
```

Splits calculation (inline helper, not exported):
```typescript
function calcEqualSplits(totalStr: string, members: GroupMember[]): ExpenseSplit[] {
  const total = parseFloat(totalStr);
  if (isNaN(total) || total <= 0) return [];
  const base = Math.floor((total / members.length) * 100) / 100;
  const remainder = parseFloat((total - base * members.length).toFixed(2));
  return members.map((m, i) => ({
    userId: m.userId,
    // First member (payer) absorbs floating-point remainder
    amount: i === 0 ? String(+(base + remainder).toFixed(2)) : String(base),
  }));
}
```

"Review" button:
- Disabled when: `!amount || !description || !payer || (splitMode === "custom" && !splitsValid)`
- `splitsValid`: `Math.abs(customSplits.reduce((s, x) => s + parseFloat(x.amount), 0) - parseFloat(amount)) < 0.01`

**Stage `"reviewing"`**:

Summary card:
```tsx
<Text className="text-white font-bold text-lg">
  {payerName} paid {amount} {token}
</Text>
<Text className="text-neutral-400 mt-1">{description}</Text>

{splits.map(s => (
  <View key={s.userId} className="flex-row justify-between mt-2">
    <Text className="text-neutral-300">{getMemberName(s.userId)}</Text>
    <Text className={s.userId === privyUserId ? "text-red-400" : "text-neutral-400"}>
      {s.userId === payer ? "paid" : `owes ${s.amount} ${token}`}
    </Text>
  </View>
))}
```

"Confirm" → `"saving"` | "Edit" → back to `"input"`

**Stage `"saving"`**:
```typescript
const saved = await addExpense({ groupId, paidBy: payer, amount, token, description, splits });
cacheExpenses(groupId, [...getCachedExpenses(groupId), saved]);
// advance to "done"
```

**Stage `"done"`**:
```tsx
<Text className="text-green-400 text-xl font-bold">Expense added</Text>
// Auto-navigate back after 1.5s:
useEffect(() => {
  const t = setTimeout(() => router.back(), 1500);
  return () => clearTimeout(t);
}, []);
```

---

## 5.5 Settle Up Flow

> PRD: Show net balances per member, one-tap Settle (private or public), mark settled after tx confirmation.

### `app/(app)/group/[id].tsx` (NEW)

```typescript
const { id: groupId } = useLocalSearchParams<{ id: string }>();
const group = useGroupsStore(s => s.groups.find(g => g.id === groupId));
const { expenses, settlements, netBalances, loading, refresh } = useGroupExpenses(groupId);
const { wallet, tongo, privyUserId, starknetAddress, tongoRecipientId } = useAuthStore();

const [settleTarget, setSettleTarget] = useState<NetBalance | null>(null);
```

**Screen layout** (single `ScrollView`):

```
┌─────────────────────────────────┐
│  ← Back       "Lunch"      [+]  │  ← FAB navigates to add-expense
├─────────────────────────────────┤
│  Members: [Alice] [Bob] [Carol]  │
├─────────────────────────────────┤
│  NET BALANCES                   │
│  You owe Alice 12.50 USDC  [Settle]│  ← purple button
│  Bob owes you  5.00 USDC   [Remind]│  ← grey, shows "coming soon"
│  You're all settled up!          │  ← empty state when netBalances = []
├─────────────────────────────────┤
│  EXPENSES                       │
│  [ExpenseItem] Pizza · 30 USDC  │
│  [ExpenseItem] Taxi · 18 STRK   │
└─────────────────────────────────┘
```

Realtime subscriptions (auto-refresh when group data changes on any device):
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`group-${groupId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${groupId}` },
      () => refresh()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "settlements", filter: `group_id=eq.${groupId}` },
      () => refresh()
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [groupId]);
```

### Settle Modal (inline — rendered inside `group/[id].tsx`)

```typescript
type SettleStage = "idle" | "sending" | "done";
const [settleStage, setSettleStage] = useState<SettleStage>("idle");
const [isPrivate, setIsPrivate] = useState(true);
```

```tsx
<Modal visible={!!settleTarget} transparent animationType="slide">
  <View className="flex-1 justify-end">
    <View className="bg-neutral-900 rounded-t-3xl p-6">
      <Text className="text-white text-xl font-bold mb-4">
        Settle {settleTarget?.amount.toFixed(2)} {settleTarget?.token} with{" "}
        {getMember(settleTarget?.toUserId)?.displayName}
      </Text>

      {/* Private / Public toggle */}
      {settleStage === "idle" && (
        <>
          <View className="flex-row bg-neutral-800 rounded-xl p-1 mb-6">
            <Pressable
              onPress={() => setIsPrivate(true)}
              disabled={!getMember(settleTarget?.toUserId)?.tongoId}
              className={`flex-1 py-2 rounded-lg ${isPrivate ? "bg-purple-700" : ""}`}
            >
              <Text className="text-white text-center text-sm">
                Private {!getMember(settleTarget?.toUserId)?.tongoId ? "(unavailable)" : ""}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsPrivate(false)}
              className={`flex-1 py-2 rounded-lg ${!isPrivate ? "bg-neutral-600" : ""}`}
            >
              <Text className="text-white text-center text-sm">Public</Text>
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
            <Text className="text-white text-center font-bold">Confirm & Settle</Text>
          </Pressable>
        </>
      )}

      {settleStage === "sending" && (
        <View className="items-center py-6">
          <ActivityIndicator color="#7B5EA7" />
          <Text className="text-purple-400 mt-2">
            {isPrivate ? "Generating ZK proof..." : "Sending..."}
          </Text>
        </View>
      )}

      {settleStage === "done" && (
        <View className="items-center py-6">
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text className="text-green-400 text-lg font-bold mt-2">Settled!</Text>
        </View>
      )}
    </View>
  </View>
</Modal>
```

`handleSettle` function:
```typescript
async function handleSettle() {
  if (!settleTarget || !wallet || !tongo) return;
  setSettleStage("sending");
  try {
    const recipient = group!.members.find(m => m.userId === settleTarget.toUserId)!;
    const amountStr = String(settleTarget.amount);
    const token = TOKENS[settleTarget.token as keyof typeof TOKENS];

    let txHash: string;
    if (isPrivate) {
      const recipientId = parseTongoQr(recipient.tongoId!)!;
      const tx = await sendPrivate(wallet, tongo, recipientId, amountStr, token);
      txHash = tx.hash;
    } else {
      const tx = await wallet.tx()
        .transfer(recipient.starknetAddress!, Amount.parse(amountStr, token))
        .send();
      txHash = tx.hash;
    }

    // Record on-chain settlement to Supabase
    await recordSettlement({
      groupId,
      fromUserId: privyUserId!,
      toUserId: settleTarget.toUserId,
      amount: amountStr,
      token: settleTarget.token,
      txHash,
      isPrivate,
    });

    // Record in local tx history
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
  } catch (e) {
    setSettleStage("idle");
    Alert.alert("Settlement failed", (e as Error).message);
  }
}
```

---

## 5.6 Groups Screen

> PRD: List of groups, total unsettled amount, tap → group detail, "New Group" FAB.

### `app/(app)/groups.tsx` (NEW)

```typescript
export default function GroupsScreen() {
  const { groups, refresh } = useGroups();
  const { groups: storeGroups, loading } = useGroupsStore();
  const { privyUserId } = useAuthStore();

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-4 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">Groups</Text>
      </View>

      {loading && storeGroups.length === 0 ? (
        <ActivityIndicator color="#7B5EA7" className="mt-8" />
      ) : storeGroups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={48} color="#4b5563" />
          <Text className="text-neutral-500 text-center mt-4">
            No groups yet — create one to start splitting expenses
          </Text>
        </View>
      ) : (
        <FlatList
          data={storeGroups}
          keyExtractor={g => g.id}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              selfId={privyUserId!}
              onPress={() => router.push(`/(app)/group/${item.id}`)}
            />
          )}
          refreshing={loading}
          onRefresh={refresh}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}

      {/* New Group FAB */}
      <Pressable
        onPress={() => router.push("/(app)/group/new")}
        className="absolute bottom-8 right-6 bg-purple-700 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}
```

### `components/GroupCard.tsx` (NEW)

```typescript
interface GroupCardProps {
  group: Group;
  selfId: string;
  onPress: () => void;
}

export function GroupCard({ group, selfId, onPress }: GroupCardProps) {
  // Calculate unsettled summary from cached data (sync — no async in render)
  const cachedExpenses = getCachedExpenses(group.id);
  const net = calcNetBalances(cachedExpenses, [], selfId);
  const totalOwed = net.filter(b => b.fromUserId === selfId).reduce((s, b) => s + b.amount, 0);
  const totalOwing = net.filter(b => b.toUserId === selfId).reduce((s, b) => s + b.amount, 0);

  const primaryToken = cachedExpenses[0]?.token ?? "";
  let balanceText = "Settled up";
  let balanceColor = "text-neutral-500";
  if (totalOwed > 0.005) {
    balanceText = `You owe ${totalOwed.toFixed(2)} ${primaryToken}`;
    balanceColor = "text-red-400";
  } else if (totalOwing > 0.005) {
    balanceText = `You're owed ${totalOwing.toFixed(2)} ${primaryToken}`;
    balanceColor = "text-green-400";
  }

  return (
    <Pressable onPress={onPress} className="bg-neutral-900 rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-white font-bold text-base">{group.name}</Text>
          <Text className="text-neutral-500 text-sm mt-0.5">
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className={`${balanceColor} text-sm font-medium mr-2`}>{balanceText}</Text>
          <Ionicons name="chevron-forward" size={16} color="#6b7280" />
        </View>
      </View>
    </Pressable>
  );
}
```

### `components/ExpenseItem.tsx` (NEW)

```typescript
interface ExpenseItemProps {
  expense: Expense;
  selfId: string;
  members: GroupMember[];
}

export function ExpenseItem({ expense, selfId, members }: ExpenseItemProps) {
  const payerName = members.find(m => m.userId === expense.paidBy)?.displayName ?? "Unknown";
  const mySplit = expense.splits.find(s => s.userId === selfId);
  const iPaid = expense.paidBy === selfId;

  let shareText = "";
  let shareColor = "text-neutral-400";
  if (iPaid) {
    shareText = "You paid";
    shareColor = "text-green-400";
  } else if (mySplit) {
    const settled = expense.settledBy.includes(selfId);
    shareText = settled ? "Settled" : `You owe ${mySplit.amount} ${expense.token}`;
    shareColor = settled ? "text-neutral-500 line-through" : "text-red-400";
  }

  return (
    <View className="flex-row justify-between items-start py-3 border-b border-neutral-800">
      <View className="flex-1 pr-4">
        <Text className="text-white font-medium">{expense.description}</Text>
        <Text className="text-neutral-500 text-xs mt-0.5">
          {payerName} paid · {new Date(expense.createdAt).toLocaleDateString()}
        </Text>
        <Text className={`${shareColor} text-xs mt-1`}>{shareText}</Text>
      </View>
      <Text className="text-white font-bold">
        {expense.amount} {expense.token}
      </Text>
    </View>
  );
}
```

### Tab bar update — `app/(app)/_layout.tsx` (EXTEND)

```tsx
// Add Groups tab between home and earn (or after home — adjust order as preferred)
<Tabs.Screen
  name="groups"
  options={{
    title: "Groups",
    tabBarIcon: ({ color }) => (
      <Ionicons name="people-outline" size={24} color={color} />
    ),
  }}
/>

// Hide nested group screens from the tab bar
<Tabs.Screen name="group/[id]"         options={{ href: null }} />
<Tabs.Screen name="group/new"          options={{ href: null }} />
<Tabs.Screen name="group/add-expense"  options={{ href: null }} />
```

---

## Files Modified / Created

| File | Action | Maps to PRD |
|---|---|---|
| `lib/supabase.ts` | NEW | 5.2 |
| `lib/groups.ts` | NEW | 5.1, 5.2, 5.5 |
| `lib/groupsCache.ts` | NEW | 5.2 |
| `lib/resolver.ts` | NEW | 5.3 |
| `stores/groups.ts` | NEW | 5.2 |
| `hooks/useGroups.ts` | NEW | 5.2 |
| `hooks/useGroupExpenses.ts` | NEW | 5.2, 5.5 |
| `components/GroupCard.tsx` | NEW | 5.6 |
| `components/ExpenseItem.tsx` | NEW | 5.4, 5.6 |
| `app/(app)/groups.tsx` | NEW | 5.6 |
| `app/(app)/group/[id].tsx` | NEW | 5.5, 5.6 |
| `app/(app)/group/new.tsx` | NEW | 5.3 |
| `app/(app)/group/add-expense.tsx` | NEW | 5.4 |
| `app/(app)/_layout.tsx` | EXTEND | 5.6 |
| `hooks/useAuthInit.ts` | EXTEND | 5.3 (call registerProfile after phone verify) |
| `app/index.tsx` | EXTEND | 5.3 (deep link invite handler) |

---

## Supabase Setup Notes

Before running Category 5 on a real device:

1. Create a project at `supabase.com`
2. Run the full SQL schema from section 5.1 in the Supabase SQL editor
3. In `.env`, fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```
4. Enable Realtime for `expenses` and `settlements` tables: **Supabase Dashboard → Database → Replication → toggle tables on**
5. The `group_invites` table does not need Realtime

MVP skips RLS for speed — add RLS policies in Category 8 before mainnet deployment.

---

## SDK Types Reference

```typescript
// Reused from Category 4 — confidential transfer for private settle
wallet.tx().confidentialTransfer(tongo, { amount, to: recipientId, sender }): TxBuilder
// .preflight() → { ok: boolean, reason?: string }
// .send()      → { hash: string }

// Public transfer for public settle
wallet.tx().transfer(toAddress: string, amount: Amount): TxBuilder

// Amount
Amount.parse(amountStr: string, token: Token): Amount

// parseTongoQr from lib/tongo.ts
parseTongoQr(input: string): ConfidentialRecipient | null
// Parses "tongo:<x>:<y>" → { x: BigInt, y: BigInt }
```

---

## Edge Cases & Guards

| Scenario | Guard |
|---|---|
| Supabase unreachable | Serve from SQLite cache; show stale banner; retry on screen focus |
| Phone not in SpiceUP | Add member with `phone_hash` only; "invited" badge; expenses still recorded |
| Member has no `tongoId` | Private settle toggle disabled; tooltip: "Alice hasn't set up private balance" |
| Public settle with no `starknetAddress` | Settle button hidden entirely for this member |
| Equal split rounding | Remainder added to payer's share (always correct to ±$0.01) |
| Custom split doesn't sum | Review blocked; "Splits must total 30.00 USDC" error shown inline |
| Group with 1 member | "Create Group" button disabled until `members.length >= 2` |
| Settle own debt to self | `fromUserId !== toUserId` guard in `calcNetBalances` — can't occur |
| Deep link with expired/invalid token | `resolveInvite` returns `null` → `Alert.alert("Invalid invite link")` |
| Double-settle | Settlements already factored into `calcNetBalances` — net balance drops to ~0, Settle button not shown |
| Zero net balance | "You're all settled up!" empty state in net balances section |
| Preflight failure on private settle | `Alert.alert("Transaction would fail", result.reason)` → modal stays open |
| Network error during settle | `catch` → `Alert.alert("Settlement failed", e.message)` → `settleStage` reset to `"idle"` |

---

## Verification Checklist

```bash
npx tsc --noEmit
# Expect: 0 errors
```

Manual flows using two real devices (Device A = Alice, Device B = Bob) on Sepolia:

**5.3 — Create Group**:
- Device A: Groups → + → enter "Dinner" → add Bob's phone → "Create Group"
- ✓ Group "Dinner" appears on Device A's Groups screen
- ✓ Share invite link → Device B opens link → joins group
- ✓ Group appears on Device B with both members

**5.3 — Deep Link Invite (cold start)**:
- Device B closes app → receives invite link → taps link → app opens → group joined → navigates to group detail
- ✓ Bob is added to group_members in Supabase

**5.4 — Add Expense (equal split)**:
- Device A: open "Dinner" → + → Alice paid, 30 USDC, "Pizza", equal split → Review → Confirm
- ✓ "Pizza — 30 USDC" appears in expense list on both devices (Realtime)
- ✓ GroupCard on Device B shows "You owe 15.00 USDC"

**5.4 — Add Expense (custom split)**:
- Device A: 40 USDC "Hotel", Alice 20 / Bob 20 custom split → Confirm
- ✓ Both splits recorded correctly in `expense_splits`

**5.5 — Settle Up (Private)**:
- Device B: open "Dinner" → Net Balances: "You owe Alice 15.00 USDC" → Settle → Private (pre-selected)
- ✓ "Generating ZK proof..." shown
- ✓ "Settled!" confirmation in modal
- ✓ Settlement recorded in Supabase with `is_private = true`, `tx_hash` set
- ✓ Net balance section clears on both devices after Realtime refresh
- ✓ Alice's confidential balance increases on next 15s poll

**5.5 — Settle Up (Public)**:
- Same as above but toggle to Public
- ✓ Regular transfer via `wallet.tx().transfer()`
- ✓ Recorded with `is_private = false`

**5.6 — Groups Screen**:
- ✓ Groups list populated with correct unsettled balances
- ✓ "Settled up" shown after settlement clears all debts
- ✓ Pull-to-refresh triggers Supabase re-fetch
- ✓ FAB navigates to group/new.tsx

---

## What's NOT in Category 5

Deferred to later categories:

- Fiat-equivalent amounts on expenses (→ Category 6, after price feed added)
- "Remind" push notification to debtors (→ Category 7)
- Push notifications when new expense is added to your group (→ Category 7)
- Row Level Security (RLS) enforcement on Supabase (→ Category 8, pre-mainnet)
- Unit tests for `lib/groups.ts` (especially `calcNetBalances`) (→ Category 8)
- Base58 Tongo address input in add-member (→ Category 7, once Tongo docs clarify conversion)
- Multi-token group expenses with cross-token settlement (→ future)
- Group expense export / receipt sharing (→ future)
