# Category 3 — Core Wallet Layer (Detailed Plan)

> **Goal**: Users can see their balances (public + confidential), receive funds via QR code, and perform basic public transfers. The home screen becomes a functional wallet dashboard with real-time balances, transaction history, and quick actions.

---

## 1. Context

**Why this category exists**: Cat 2 proved that auth works — users can sign in, get a Starknet wallet + Tongo key, and land on a home screen. But that screen only displays addresses. Before we can build confidential payments (Cat 4) or group expenses (Cat 5), users need to *see* what they own and *do* basic operations: check balances, receive tokens, send public transfers, and review transaction history. This is the wallet's backbone.

**Where we're starting**: Cat 2 is complete. The auth store (`stores/auth.ts`) holds `wallet: OnboardResult` and `tongo: TongoConfidential` instances ready for queries. The SDK singleton (`lib/starkzap.ts`) is initialized. Token addresses exist in `constants/network.ts`. The `app/(app)/` shell is a bare `Stack` navigator showing static addresses and a settings page. All runtime deps (starkzap, starkzap-native, react-native-qrcode-svg, expo-sqlite, zustand) are already installed.

**Where we land**: The home screen shows real ETH, STRK, and USDC balances (public + confidential) with 15-second polling. Users can toggle between public and private addresses on a receive screen with QR codes. A basic send screen handles public ERC20 transfers with preflight simulation. Transaction records are cached locally in AsyncStorage (since Tongo hides amounts on-chain). The `app/(app)/` layout uses bottom tab navigation. Everything compiles, passes `tsc --noEmit`, and works on web dev server.

**Intended outcome**: A functional wallet that Cat 4 (confidential payments), Cat 5 (groups), and Cat 6 (yield) can build on top of. No confidential send/receive flows yet — those are Cat 4.

---

## 2. What We're Building (Deliverables)

1. **Token constants** (`constants/tokens.ts`) — `Token` objects for STRK, ETH, USDC per network, using Starkzap's `Token` interface
2. **Balance hook** (`hooks/useBalance.ts`) — polls `wallet.balanceOf(token)` for all three public tokens every 15s
3. **Confidential balance hook** (`hooks/useConfidentialBalance.ts`) — calls `tongo.getState()` for private balance + pending + nonce
4. **Auto-rollover** — on login, if `pending > 0`, prompt user to rollover (activate pending confidential balance)
5. **Wallet store** (`stores/wallet.ts`) — Zustand store for balances, pending state, and last update timestamp
6. **Transaction history** (`lib/txHistory.ts`) — AsyncStorage-backed local cache of `{ type, amount, counterparty, timestamp, txHash, isPrivate }` records
7. **Transaction history hook** (`hooks/useTransactionHistory.ts`) — reads/writes tx records, exposes sorted feed
8. **Receive screen** (`app/(app)/receive.tsx`) — QR codes for public (Starknet address) and private (Tongo recipientId) addresses, toggle between them
9. **Send screen** (`app/(app)/send.tsx`) — public ERC20 transfer: recipient input, amount input with token selector, preflight simulation, execute
10. **Home screen redesign** (`app/(app)/home.tsx`) — balance cards, confidential balance, recent transactions feed, quick action buttons (Send, Receive)
11. **Tab navigation** (`app/(app)/_layout.tsx`) — bottom tabs: Home, Send, Receive, Settings
12. **Amount formatting helpers** (`lib/format.ts`) — fiat placeholder + token display utilities wrapping `Amount.toFormatted()`
13. **Pending rollover UI** — badge on home screen when confidential pending > 0, one-tap rollover button

Success = Running `npx expo start --clear`, logging in, seeing real balances (even if 0 on Sepolia), navigating via tab bar to Send/Receive/Settings, generating a QR code on the receive screen, and building a public transfer on the send screen (simulated via preflight if no funds).

---

## 3. CRITICAL BLOCKER: Tongo Contract Address

**Problem**: `constants/network.ts` has `tongoContract: "0x0"` for both Sepolia and Mainnet. The `TongoConfidential` instance was created in Cat 2 with this placeholder. For Cat 3, `tongo.getState()` will fail if the contract address is `0x0` — it will try to read on-chain state from a non-existent contract.

**Impact**: Confidential balance display and rollover logic will error at runtime. Public balances and transfers are NOT blocked.

**Mitigation**:
1. **Best case**: Obtain the real Tongo contract address from Tongo docs, Starknet Discord, or the `@fatsolutions/tongo-sdk` package metadata before starting Cat 3.
2. **Fallback**: Guard `tongo.getState()` calls with a check — if `NETWORK.tongoContract === "0x0"`, return `{ balance: 0n, pending: 0n, nonce: 0n }` and show "Confidential balance unavailable — contract not deployed" in the UI. This lets all public wallet features ship while confidential balance waits for the real address.

**Fix when address is obtained**:
```bash
# Update constants/network.ts with the real addresses:
# SEPOLIA.tongoContract = "0x<real-address>"
# MAINNET.tongoContract = "0x<real-address>"
```

**Secondary**: `SEPOLIA.tokens.USDC` is `"0x0"`. Sepolia USDC balance queries will fail. Either find the Sepolia USDC address or skip USDC on Sepolia (show "N/A").

---

## 4. Tools & Accounts Needed (Outside the Repo)

| Tool | Purpose | How to Get | Required For |
|---|---|---|---|
| **Privy account** (from Cat 2) | Auth — already configured | Already done | Login flow still works |
| **Sepolia ETH faucet** | Fund test wallet with ETH to verify balance display | `starknet-faucet.vercel.app` or Starknet Discord faucet | Balance verification (non-zero balances) |
| **Sepolia STRK faucet** | Fund test wallet with STRK | Same faucet | STRK balance verification |
| **Tongo contract address** | Real contract for `getState()` | Tongo docs / Starknet Discord / `@fatsolutions/tongo-sdk` | Confidential balance display |
| **AVNU Propulsion API key** | Gasless public transfers | `propulsion.starknet.org` → `portal.avnu.fi` | **Optional** — Cat 3 can test with user-paid fees; gasless is nice-to-have |

**Verdict**: Public balance and transfer features can ship with just the existing setup + faucet funds. Confidential balance needs the Tongo contract address (or the fallback guard). AVNU paymaster is optional — transfers will just cost the user a small fee on Sepolia.

---

## 5. Package Dependencies

### 5.1 Already installed (no new packages needed)

All dependencies required for Cat 3 were installed in Cat 1 and Cat 2:

| Package | Version | Purpose | Status |
|---|---|---|---|
| `starkzap` | `^2.0.0` | Core SDK — `Amount`, `Token`, `Wallet`, `TxBuilder` | Installed |
| `starkzap-native` | `^2.0.0` | React Native build of StarkZap | Installed |
| `react-native-qrcode-svg` | `^6.3.21` | QR code generation for receive screen | Installed |
| `react-native-svg` | `15.15.3` | SVG rendering (dep of qrcode-svg) | Installed |
| `@react-native-async-storage/async-storage` | `2.2.0` | Transaction history storage | Installed |
| `zustand` | `^5.0.12` | Wallet balance store | Installed |
| `@expo/vector-icons` | `^15.0.3` | Tab bar icons, action button icons | Installed |
| `expo-clipboard` | — | Copy address to clipboard (check if installed) | Verify |

### 5.2 Verify clipboard support

```bash
npx expo install expo-clipboard
# Safe to re-run — installs only if missing
```

### 5.3 Verification

```bash
npm ls starkzap react-native-qrcode-svg @react-native-async-storage/async-storage zustand
npx expo-doctor
```

---

## 6. Directory Structure Changes

```
SpiceUP/
├── constants/
│   ├── network.ts              ← EXISTING (update Tongo address + USDC Sepolia when available)
│   └── tokens.ts               ← NEW: Token objects (STRK, ETH, USDC) using starkzap Token type
├── lib/
│   ├── starkzap.ts             ← EXISTING (no changes needed — getSdk() and initWallet() sufficient)
│   ├── tongo.ts                ← EXISTING (no changes needed — initTongo() sufficient)
│   ├── format.ts               ← NEW: amount formatting + fiat placeholder utils
│   └── txHistory.ts            ← NEW: AsyncStorage-backed transaction record cache
├── stores/
│   ├── auth.ts                 ← EXISTING (no changes — wallet + tongo instances stay here)
│   └── wallet.ts               ← NEW: Zustand store for balances (public + confidential)
├── hooks/
│   ├── useAuthInit.ts          ← EXISTING (no changes)
│   ├── useAuthGuard.ts         ← EXISTING (no changes)
│   ├── useBalance.ts           ← NEW: polls public token balances every 15s
│   ├── useConfidentialBalance.ts ← NEW: fetches Tongo getState() with rollover detection
│   └── useTransactionHistory.ts  ← NEW: read/write local tx records
├── components/
│   ├── BalanceCard.tsx          ← NEW: shows token balance with icon + formatted amount
│   ├── ConfidentialBalanceCard.tsx ← NEW: shows private balance + pending badge
│   ├── TransactionItem.tsx      ← NEW: single tx row with private/public badge
│   ├── AmountInput.tsx          ← NEW: numeric input with token selector dropdown
│   ├── AddressDisplay.tsx       ← NEW: shortened address with copy-to-clipboard
│   └── TokenSelector.tsx        ← NEW: picker for STRK/ETH/USDC
└── app/(app)/
    ├── _layout.tsx              ← REPLACE: Stack → Bottom Tab navigator
    ├── home.tsx                 ← REPLACE: address display → balance dashboard
    ├── send.tsx                 ← NEW: public ERC20 transfer flow
    ├── receive.tsx              ← NEW: QR code display (public + private toggle)
    └── settings.tsx             ← EXISTING (no changes)
```

---

## 7. Step-by-Step Build Sequence

### Step 7.1 — Create token constants

File: `constants/tokens.ts`

Define `Token` objects matching Starkzap's `Token` interface (`{ name, address, decimals, symbol }`). Import addresses from `NETWORK.tokens`. This is the single source of truth for token metadata — every balance query, transfer, and display references these objects.

### Step 7.2 — Create wallet store

File: `stores/wallet.ts`

Zustand store holding public balances (`{ STRK: Amount | null, ETH: Amount | null, USDC: Amount | null }`), confidential state (`ConfidentialState | null`), last update timestamp, and loading/error flags. Separate from auth store — auth is identity, wallet is financial state.

### Step 7.3 — Create formatting utilities

File: `lib/format.ts`

Thin wrappers: `formatBalance(amount: Amount)` → `amount.toFormatted(true)` (compressed), `shortenAddress(addr: string)` → `0x1234...abcd`, and a placeholder `toFiat(amount: Amount, token: string)` that returns `"$—"` until a price feed is added in Cat 6.

### Step 7.4 — Create balance hooks

Files: `hooks/useBalance.ts`, `hooks/useConfidentialBalance.ts`

`useBalance()` reads `wallet` from auth store, calls `wallet.balanceOf(token)` for each of STRK/ETH/USDC, writes results to wallet store, and sets up a 15-second polling interval via `useEffect` + `setInterval`. Cleans up on unmount.

`useConfidentialBalance()` reads `tongo` from auth store, calls `tongo.getState()`, writes `{ balance, pending, nonce }` to wallet store. Guards against `tongoContract === "0x0"`. Detects `pending > 0` and exposes a `needsRollover` flag.

### Step 7.5 — Create transaction history module + hook

Files: `lib/txHistory.ts`, `hooks/useTransactionHistory.ts`

`lib/txHistory.ts`: AsyncStorage key `"spiceup.txHistory"`. Functions: `saveTx(record)`, `getTxHistory(): TxRecord[]`, `clearHistory()`. Each record: `{ id, type: "send" | "receive" | "fund" | "withdraw", amount: string, token: string, counterparty: string, timestamp: number, txHash: string, isPrivate: boolean }`.

Hook reads history on mount, exposes sorted array (newest first), and a `recordTx()` function for screens to call after successful transactions.

### Step 7.6 — Create shared UI components

Files: `components/BalanceCard.tsx`, `components/ConfidentialBalanceCard.tsx`, `components/TransactionItem.tsx`, `components/AmountInput.tsx`, `components/AddressDisplay.tsx`, `components/TokenSelector.tsx`

All components use NativeWind classes consistent with the existing design system (dark background `#0D0D0D`, accent purple `#7B5EA7`, neutral-900 cards).

### Step 7.7 — Build receive screen

File: `app/(app)/receive.tsx`

Toggle between "Public" (Starknet address) and "Private" (Tongo recipientId) via segmented control. Render QR code via `react-native-qrcode-svg`. Copy-to-clipboard button below. Show formatted address with `AddressDisplay` component.

### Step 7.8 — Build send screen

File: `app/(app)/send.tsx`

Input: recipient Starknet address (text input — QR scan deferred to Cat 4). Token selector (STRK/ETH/USDC). Amount input. "Review" button runs `wallet.tx().transfer(token, { to, amount }).preflight()` — if `ok`, show confirmation sheet. "Send" calls `.send()` and records the tx in history. Shows `tx.explorerUrl` on success.

### Step 7.9 — Redesign home screen

File: `app/(app)/home.tsx`

Replace static address display with: greeting + total balance area, `BalanceCard` for each token, `ConfidentialBalanceCard` (with pending rollover badge if `pending > 0`), quick action row (Send, Receive buttons), and a scrollable recent transactions feed using `TransactionItem`. Pull-to-refresh triggers immediate balance poll.

### Step 7.10 — Replace app layout with tab navigation

File: `app/(app)/_layout.tsx`

Replace `Stack` with Expo Router's `Tabs` navigator. Four tabs: Home (house icon), Send (arrow-up icon), Receive (arrow-down icon), Settings (gear icon). Dark tab bar matching the design system.

### Step 7.11 — Verify

```bash
npx tsc --noEmit       # 0 errors
npx expo-doctor        # all checks pass
npx expo start --clear # press 'w' for web
```

Manual checks — see Section 9.

---

## 8. File Contents (Exact or Skeletons)

### 8.1 `constants/tokens.ts`
```ts
import type { Token, Address } from "starkzap";
import { NETWORK } from "@/constants/network";

export const STRK: Token = {
  name: "Starknet Token",
  address: NETWORK.tokens.STRK as Address,
  decimals: 18,
  symbol: "STRK",
};

export const ETH: Token = {
  name: "Ether",
  address: NETWORK.tokens.ETH as Address,
  decimals: 18,
  symbol: "ETH",
};

export const USDC: Token = {
  name: "USD Coin",
  address: NETWORK.tokens.USDC as Address,
  decimals: 6,
  symbol: "USDC",
};

/** All supported tokens, in display order. */
export const ALL_TOKENS: Token[] = [ETH, STRK, USDC];

/** Lookup by symbol. */
export const TOKEN_BY_SYMBOL: Record<string, Token> = {
  STRK,
  ETH,
  USDC,
};
```

### 8.2 `stores/wallet.ts`
```ts
import { create } from "zustand";
import type { Amount } from "starkzap";
import type { ConfidentialState } from "starkzap";

interface WalletState {
  // Public balances keyed by token symbol
  balances: {
    ETH: Amount | null;
    STRK: Amount | null;
    USDC: Amount | null;
  };

  // Confidential (Tongo) state
  confidential: ConfidentialState | null;
  confidentialAvailable: boolean; // false if tongoContract is 0x0

  // Metadata
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;

  // Actions
  setBalance: (symbol: string, amount: Amount) => void;
  setConfidential: (state: ConfidentialState) => void;
  setConfidentialUnavailable: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markUpdated: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balances: { ETH: null, STRK: null, USDC: null },
  confidential: null,
  confidentialAvailable: true,
  lastUpdated: null,
  loading: false,
  error: null,

  setBalance: (symbol, amount) =>
    set((s) => ({
      balances: { ...s.balances, [symbol]: amount },
    })),
  setConfidential: (state) => set({ confidential: state }),
  setConfidentialUnavailable: () => set({ confidentialAvailable: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  markUpdated: () => set({ lastUpdated: Date.now() }),
}));
```

### 8.3 `lib/format.ts`
```ts
import type { Amount } from "starkzap";

/** Compressed formatted balance (max 4 decimal places). */
export function formatBalance(amount: Amount | null): string {
  if (!amount) return "—";
  return amount.toFormatted(true);
}

/** Shorten a hex address: 0x1234...abcd */
export function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Placeholder fiat conversion — returns "$—" until Cat 6 adds a price feed. */
export function toFiat(_amount: Amount | null, _token: string): string {
  return "$—";
}
```

### 8.4 `lib/txHistory.ts`
```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "spiceup.txHistory";

export interface TxRecord {
  id: string;
  type: "send" | "receive" | "fund" | "withdraw" | "rollover";
  amount: string;       // human-readable (e.g. "1.5")
  token: string;        // symbol (e.g. "ETH")
  counterparty: string; // address or "self"
  timestamp: number;    // Date.now()
  txHash: string;
  isPrivate: boolean;
}

export async function getTxHistory(): Promise<TxRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as TxRecord[];
}

export async function saveTx(record: TxRecord): Promise<void> {
  const history = await getTxHistory();
  history.unshift(record); // newest first
  // Keep last 200 records
  if (history.length > 200) history.length = 200;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
```

### 8.5 `hooks/useBalance.ts`
```ts
import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { ALL_TOKENS } from "@/constants/tokens";

const POLL_INTERVAL = 15_000; // 15 seconds

export function useBalance() {
  const wallet = useAuthStore((s) => s.wallet);
  const { setBalance, setLoading, setError, markUpdated } = useWalletStore();

  const fetchBalances = useCallback(async () => {
    if (!wallet) return;
    try {
      setLoading(true);
      const results = await Promise.allSettled(
        ALL_TOKENS.map((token) => wallet.balanceOf(token))
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          setBalance(ALL_TOKENS[i].symbol, result.value);
        }
      });
      markUpdated();
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchBalances();
    const id = setInterval(fetchBalances, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBalances]);

  return { refetch: fetchBalances };
}
```

### 8.6 `hooks/useConfidentialBalance.ts`
```ts
import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { NETWORK } from "@/constants/network";

export function useConfidentialBalance() {
  const tongo = useAuthStore((s) => s.tongo);
  const wallet = useAuthStore((s) => s.wallet);
  const { setConfidential, setConfidentialUnavailable } = useWalletStore();
  const confidential = useWalletStore((s) => s.confidential);

  const fetchState = useCallback(async () => {
    if (!tongo) return;
    // Guard: if tongo contract is placeholder, skip
    if (NETWORK.tongoContract === "0x0") {
      setConfidentialUnavailable();
      return;
    }
    try {
      const state = await tongo.getState();
      setConfidential(state);
    } catch (e) {
      // Silently fail — confidential balance is non-critical for Cat 3
      console.warn("Failed to fetch confidential state:", e);
    }
  }, [tongo]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const needsRollover = confidential ? confidential.pending > 0n : false;

  const rollover = useCallback(async () => {
    if (!tongo || !wallet || !confidential || confidential.pending === 0n) return;
    const calls = await tongo.rollover({ sender: wallet.address });
    const tx = await wallet.execute(calls);
    await tx.wait();
    // Refresh state after rollover
    await fetchState();
    return tx;
  }, [tongo, wallet, confidential, fetchState]);

  return { refetch: fetchState, needsRollover, rollover };
}
```

### 8.7 `hooks/useTransactionHistory.ts`
```ts
import { useState, useEffect, useCallback } from "react";
import { getTxHistory, saveTx, type TxRecord } from "@/lib/txHistory";

export function useTransactionHistory() {
  const [history, setHistory] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const records = await getTxHistory();
    setHistory(records);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recordTx = useCallback(
    async (record: TxRecord) => {
      await saveTx(record);
      setHistory((prev) => [record, ...prev]);
    },
    []
  );

  return { history, loading, recordTx, refetch: load };
}
```

### 8.8 `components/BalanceCard.tsx`
```tsx
import { View, Text } from "react-native";
import type { Amount, Token } from "starkzap";
import { formatBalance, toFiat } from "@/lib/format";

interface Props {
  token: Token;
  balance: Amount | null;
}

export function BalanceCard({ token, balance }: Props) {
  return (
    <View className="bg-neutral-900 p-4 rounded-xl mb-3 flex-row items-center justify-between">
      <View>
        <Text className="text-white font-semibold text-base">{token.symbol}</Text>
        <Text className="text-neutral-400 text-xs">{token.name}</Text>
      </View>
      <View className="items-end">
        <Text className="text-white text-base font-medium">
          {formatBalance(balance)}
        </Text>
        <Text className="text-neutral-500 text-xs">
          {toFiat(balance, token.symbol)}
        </Text>
      </View>
    </View>
  );
}
```

### 8.9 `components/ConfidentialBalanceCard.tsx`
```tsx
import { View, Text, Pressable } from "react-native";
import type { ConfidentialState } from "starkzap";

interface Props {
  state: ConfidentialState | null;
  available: boolean;
  needsRollover: boolean;
  onRollover: () => void;
}

export function ConfidentialBalanceCard({ state, available, needsRollover, onRollover }: Props) {
  if (!available) {
    return (
      <View className="bg-neutral-900 p-4 rounded-xl mb-3 border border-neutral-800">
        <Text className="text-neutral-500 text-sm">
          Confidential balance unavailable — contract not deployed
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-neutral-900 p-4 rounded-xl mb-3 border border-purple-900/50">
      <View className="flex-row items-center mb-2">
        <Text className="text-white font-semibold text-base">Private Balance</Text>
        <View className="bg-purple-900/60 px-2 py-0.5 rounded ml-2">
          <Text className="text-purple-300 text-xs">Private</Text>
        </View>
      </View>

      <Text className="text-white text-lg font-medium">
        {state ? String(state.balance) : "—"}
      </Text>

      {needsRollover && (
        <Pressable onPress={onRollover} className="mt-3 bg-purple-800 p-3 rounded-lg">
          <Text className="text-white text-center text-sm font-medium">
            Activate pending balance ({String(state?.pending ?? 0n)})
          </Text>
        </Pressable>
      )}
    </View>
  );
}
```

### 8.10 `components/TransactionItem.tsx`
```tsx
import { View, Text } from "react-native";
import type { TxRecord } from "@/lib/txHistory";
import { shortenAddress } from "@/lib/format";

interface Props {
  tx: TxRecord;
}

export function TransactionItem({ tx }: Props) {
  const isSend = tx.type === "send" || tx.type === "fund";
  const sign = isSend ? "-" : "+";
  const color = isSend ? "text-red-400" : "text-green-400";

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-neutral-800">
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-white text-sm font-medium capitalize">{tx.type}</Text>
          {tx.isPrivate && (
            <View className="bg-purple-900/60 px-1.5 py-0.5 rounded ml-2">
              <Text className="text-purple-300 text-[10px]">Private</Text>
            </View>
          )}
        </View>
        <Text className="text-neutral-500 text-xs mt-0.5">
          {shortenAddress(tx.counterparty)}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`${color} text-sm font-medium`}>
          {sign}{tx.amount} {tx.token}
        </Text>
        <Text className="text-neutral-600 text-xs">
          {new Date(tx.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}
```

### 8.11 `components/AmountInput.tsx`
```tsx
import { View, TextInput, Pressable, Text } from "react-native";
import type { Token } from "starkzap";
import { ALL_TOKENS } from "@/constants/tokens";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
}

export function AmountInput({ value, onChangeText, selectedToken, onSelectToken }: Props) {
  return (
    <View className="flex-row bg-neutral-900 rounded-xl overflow-hidden">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor="#666"
        keyboardType="decimal-pad"
        className="flex-1 text-white text-xl p-4"
      />
      <View className="flex-row items-center pr-2">
        {ALL_TOKENS.map((token) => (
          <Pressable
            key={token.symbol}
            onPress={() => onSelectToken(token)}
            className={`px-3 py-2 rounded-lg mx-0.5 ${
              selectedToken.symbol === token.symbol ? "bg-accent" : "bg-neutral-800"
            }`}
          >
            <Text className={`text-sm font-medium ${
              selectedToken.symbol === token.symbol ? "text-white" : "text-neutral-400"
            }`}>
              {token.symbol}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

### 8.12 `components/AddressDisplay.tsx`
```tsx
import { View, Text, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { shortenAddress } from "@/lib/format";

interface Props {
  label: string;
  address: string;
  full?: boolean;
}

export function AddressDisplay({ label, address, full = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Pressable onPress={copy} className="bg-neutral-900 p-4 rounded-xl">
      <Text className="text-neutral-400 text-xs mb-1">{label}</Text>
      <Text className="text-white" numberOfLines={full ? undefined : 1}>
        {full ? address : shortenAddress(address)}
      </Text>
      <Text className="text-neutral-500 text-xs mt-1">
        {copied ? "Copied!" : "Tap to copy"}
      </Text>
    </Pressable>
  );
}
```

### 8.13 `components/TokenSelector.tsx`
```tsx
import { View, Pressable, Text } from "react-native";
import type { Token } from "starkzap";
import { ALL_TOKENS } from "@/constants/tokens";

interface Props {
  selected: Token;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ selected, onSelect }: Props) {
  return (
    <View className="flex-row">
      {ALL_TOKENS.map((token) => (
        <Pressable
          key={token.symbol}
          onPress={() => onSelect(token)}
          className={`flex-1 p-3 rounded-xl mx-1 ${
            selected.symbol === token.symbol ? "bg-accent" : "bg-neutral-900"
          }`}
        >
          <Text className={`text-center font-medium ${
            selected.symbol === token.symbol ? "text-white" : "text-neutral-400"
          }`}>
            {token.symbol}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

### 8.14 `app/(app)/receive.tsx`
```tsx
import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import QRCode from "react-native-qrcode-svg";
import { useAuthStore } from "@/stores/auth";
import { AddressDisplay } from "@/components/AddressDisplay";

type Mode = "public" | "private";

export default function Receive() {
  const [mode, setMode] = useState<Mode>("public");
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);

  // Serialize recipientId for QR: "tongo:<x>:<y>"
  const tongoQrValue = tongoRecipientId
    ? `tongo:${String(tongoRecipientId.x)}:${String(tongoRecipientId.y)}`
    : "";

  const address = mode === "public" ? starknetAddress ?? "" : tongoQrValue;
  const label = mode === "public" ? "Starknet Address" : "Private Address (Tongo)";

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">Receive</Text>

      {/* Toggle */}
      <View className="flex-row bg-neutral-900 rounded-xl p-1 mb-8">
        <Pressable
          onPress={() => setMode("public")}
          className={`flex-1 p-3 rounded-lg ${mode === "public" ? "bg-accent" : ""}`}
        >
          <Text className={`text-center font-medium ${mode === "public" ? "text-white" : "text-neutral-400"}`}>
            Public
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("private")}
          className={`flex-1 p-3 rounded-lg ${mode === "private" ? "bg-accent" : ""}`}
        >
          <Text className={`text-center font-medium ${mode === "private" ? "text-white" : "text-neutral-400"}`}>
            Private
          </Text>
        </Pressable>
      </View>

      {/* QR Code */}
      <View className="items-center mb-8">
        <View className="bg-white p-4 rounded-2xl">
          <QRCode value={address || "empty"} size={200} />
        </View>
      </View>

      {/* Address */}
      <AddressDisplay label={label} address={address} full />

      {mode === "private" && (
        <Text className="text-neutral-500 text-xs text-center mt-4">
          Share this address to receive private transfers. Amounts will be hidden on-chain.
        </Text>
      )}
    </View>
  );
}
```

### 8.15 `app/(app)/send.tsx`
```tsx
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
  const wallet = useAuthStore((s) => s.wallet);
  const [recipient, setRecipient] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!wallet || !recipient || !amountStr) return;
    setStage("reviewing");
    try {
      const amount = Amount.parse(amountStr, token);
      const result = await wallet
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
    if (!wallet || !recipient || !amountStr) return;
    setStage("sending");
    try {
      const amount = Amount.parse(amountStr, token);
      const tx = await wallet
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
```

### 8.16 `app/(app)/home.tsx` (REPLACE)
```tsx
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useBalance } from "@/hooks/useBalance";
import { useConfidentialBalance } from "@/hooks/useConfidentialBalance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { ALL_TOKENS } from "@/constants/tokens";
import { BalanceCard } from "@/components/BalanceCard";
import { ConfidentialBalanceCard } from "@/components/ConfidentialBalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import { ActivityIndicator } from "react-native";

export default function Home() {
  const router = useRouter();
  const { status, error } = useAuthStore();
  const { balances, confidential, confidentialAvailable, loading } = useWalletStore();
  const { refetch: refetchBalances } = useBalance();
  const { refetch: refetchConfidential, needsRollover, rollover } = useConfidentialBalance();
  const { history } = useTransactionHistory();

  if (status !== "ready") {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator color="#7B5EA7" />
        <Text className="text-neutral-400 mt-4">
          {status === "error" ? error : "Setting up your wallet..."}
        </Text>
      </View>
    );
  }

  function onRefresh() {
    refetchBalances();
    refetchConfidential();
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-6 pt-16 pb-8"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#7B5EA7" />
      }
    >
      <Text className="text-white text-2xl font-bold mb-6">SpiceUP</Text>

      {/* Public balances */}
      {ALL_TOKENS.map((token) => (
        <BalanceCard
          key={token.symbol}
          token={token}
          balance={balances[token.symbol as keyof typeof balances]}
        />
      ))}

      {/* Confidential balance */}
      <ConfidentialBalanceCard
        state={confidential}
        available={confidentialAvailable}
        needsRollover={needsRollover}
        onRollover={rollover}
      />

      {/* Quick actions */}
      <View className="flex-row mt-4 mb-6">
        <Pressable
          onPress={() => router.push("/(app)/send")}
          className="flex-1 bg-accent p-4 rounded-xl mr-2"
        >
          <Text className="text-white text-center font-semibold">Send</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(app)/receive")}
          className="flex-1 bg-neutral-800 p-4 rounded-xl ml-2"
        >
          <Text className="text-white text-center font-semibold">Receive</Text>
        </Pressable>
      </View>

      {/* Recent transactions */}
      <Text className="text-white text-lg font-semibold mb-3">Recent Activity</Text>
      {history.length === 0 ? (
        <Text className="text-neutral-500 text-sm">No transactions yet</Text>
      ) : (
        history.slice(0, 10).map((tx) => <TransactionItem key={tx.id} tx={tx} />)
      )}
    </ScrollView>
  );
}
```

### 8.17 `app/(app)/_layout.tsx` (REPLACE)
```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0D0D0D",
          borderTopColor: "#1a1a1a",
        },
        tabBarActiveTintColor: "#7B5EA7",
        tabBarInactiveTintColor: "#666",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-up-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-down-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## 9. Verification Checklist

Run in order — all must pass:

### 9.1 Static checks
```bash
npx tsc --noEmit
# 0 errors

npx expo-doctor
# all checks pass
```

### 9.2 Balance display (web)
```bash
npx expo start --clear
# press 'w'
```
Manual steps:
- [ ] Login via email OTP → lands on home
- [ ] Home shows three `BalanceCard`s (ETH, STRK, USDC) — values may be `0 ETH` etc. on unfunded Sepolia wallet
- [ ] Confidential balance card shows either "unavailable" (if `tongoContract` is `0x0`) or `0` balance
- [ ] Pull-to-refresh triggers balance re-fetch (spinner appears briefly)

### 9.3 Tab navigation
- [ ] Bottom tab bar visible with 4 tabs: Home, Send, Receive, Settings
- [ ] Tapping each tab navigates to the correct screen
- [ ] Active tab is highlighted in purple

### 9.4 Receive screen
- [ ] Toggle between "Public" and "Private" mode
- [ ] QR code renders in both modes
- [ ] Tap on address copies to clipboard ("Copied!" text appears)
- [ ] Private mode shows "tongo:..." serialized value

### 9.5 Send screen
- [ ] Token selector shows ETH/STRK/USDC, tapping switches selection
- [ ] Entering recipient + amount + pressing "Review" runs preflight
- [ ] If preflight fails (e.g. insufficient balance), alert shown and returns to input
- [ ] If preflight passes, confirmation card shown with "Confirm & Send" button
- [ ] Cancel returns to input state

### 9.6 Transaction history
- [ ] After a successful send, home screen shows the transaction in "Recent Activity"
- [ ] Transaction shows correct type, amount, token, and truncated address

### 9.7 Settings (unchanged)
- [ ] Settings screen still works (address display, export key, logout)
- [ ] Logout → clears state → routes to login

### 9.8 Fund and re-check (optional, requires faucet)
- [ ] Fund Sepolia wallet with ETH from faucet
- [ ] Wait 15 seconds → balance updates to non-zero on home
- [ ] Send a small ETH transfer → success → balance decreases → tx appears in history

### 9.9 Done criteria
- [ ] All files from Section 6 exist and compile
- [ ] Zero TypeScript errors
- [ ] Tab navigation works
- [ ] Balances display (even if 0)
- [ ] Receive screen generates QR codes
- [ ] Send screen runs preflight + executes transfers
- [ ] Transaction history persists across navigation

---

## 10. Pitfalls & Iteration Tips

### Pitfalls

1. **`wallet.balanceOf(token)` requires the `Token` to have an `address` field that matches an actual deployed ERC20 contract.** If USDC on Sepolia is `0x0`, the RPC call will fail. Guard with try/catch per token, or skip USDC on Sepolia.

2. **`Amount.parse()` throws if the input string is invalid** (empty string, negative, too many decimals). Validate user input before calling `Amount.parse()` in the send flow.

3. **`tongo.getState()` will revert if `contractAddress` is `0x0`** — the guard in `useConfidentialBalance.ts` prevents this, but if anyone calls `tongo.getState()` directly elsewhere, it will crash. Always go through the hook.

4. **`wallet.tx().transfer(...).preflight()` vs `.send()`** — `preflight()` simulates without submitting. But calling `.send()` on the same builder instance will fail because the builder tracks a `sent` flag. You must create a new `wallet.tx()` for the actual send after preflight. This is handled in Section 8.15 by creating two separate builder chains.

5. **Expo Router `Tabs` and route names** — the `name` prop in `<Tabs.Screen>` must match the filename without extension. `name="home"` maps to `app/(app)/home.tsx`. If any file is missing, the tab will render a 404.

6. **`BigInt` serialization** — `ConfidentialState.balance` and `.pending` are `bigint`. React Native's `Text` component can render `String(bigint)` but `JSON.stringify` will throw. If you store confidential state in AsyncStorage, convert to string first.

7. **QR code `value` prop cannot be empty string** — `react-native-qrcode-svg` throws if `value=""`. The receive screen handles this with `address || "empty"` fallback.

8. **Polling interval cleanup** — `useBalance` sets up `setInterval`. If the component unmounts and remounts (e.g., tab switch), multiple intervals can stack. The `useEffect` cleanup (`clearInterval`) handles this, but verify no interval leaks via React Devtools.

9. **`OnboardResult` type** — `wallet.balanceOf()` is on `WalletInterface`, but `OnboardResult` may be a different wrapper. Verify that `wallet.balanceOf` exists on the object returned by `sdk.onboard()`. If not, access it via `wallet.wallet` or a similar accessor (check `OnboardResult` type in `node_modules/starkzap/dist/src/types/`).

10. **`expo-clipboard` may not be installed** — Cat 1/2 didn't explicitly install it. Run `npx expo install expo-clipboard` as the first step. If not available, remove the `Clipboard.setStringAsync` call and use a `Pressable` with `navigator.clipboard.writeText` for web-only fallback.

### Iteration Tools

| Tool | Use |
|---|---|
| `npx tsc --noEmit --watch` | Live type checking while building components |
| `npx expo start --clear --web` | Fast iteration on web — skip mobile bundling |
| React Devtools (Chrome) | Inspect Zustand store state, verify balance values |
| Starknet Sepolia faucet | Fund the wallet to test non-zero balances + send flow |
| `node -e "const s = require('starkzap'); console.log(Object.keys(s.Amount.prototype))"` | Verify `Amount` API methods |
| `AsyncStorage.getItem("spiceup.txHistory")` in console | Debug transaction history persistence |

---

## 11. Risks & Open Unknowns

| Risk | Impact | Mitigation |
|---|---|---|
| Tongo contract address is `0x0` (placeholder) | **High** — confidential balance, rollover, and pending badge all broken | Guard with `tongoContract === "0x0"` check; show "unavailable" UI; fill real address when obtained |
| USDC Sepolia address is `0x0` | **Medium** — USDC balance query fails | try/catch per token; show "N/A" for USDC on Sepolia; fill address when found |
| `OnboardResult` may not directly expose `balanceOf()` | **Medium** — all balance queries fail | Read `OnboardResult` type definition; may need to unwrap via `.wallet` or similar accessor |
| AVNU Paymaster not configured (no API key) | **Low-Medium** — sends cost the user gas fees instead of being gasless | Acceptable for Sepolia testing; real key comes in Cat 8 grant application |
| `react-native-qrcode-svg` rendering issues on web | **Low** — QR code may not render correctly in web mode | SVG rendering works in most browsers; fallback: use a base64 PNG encoder |
| AsyncStorage limits on transaction history | **Low** — theoretically unbounded | Capped at 200 records in `saveTx()`; migrate to SQLite in Cat 5 if needed |
| Polling `balanceOf()` every 15s may hit RPC rate limits | **Low** — Starknet public RPC is generous | If rate-limited: increase interval to 30s, or switch to a dedicated RPC provider |
| `expo-clipboard` not installed | **Low** — copy-to-clipboard fails | Install it; fallback to `navigator.clipboard` for web |

---

## 12. What's NOT in Category 3

Deferred to later categories:

- **Confidential send/receive** (actual `confidentialTransfer`, `confidentialFund`, `confidentialWithdraw`) → **Cat 4**
- **QR code scanning** (camera-based address input for send screen) → **Cat 4**
- **Fiat price conversion** (real USD values for balances) → **Cat 6** (or Cat 7 polish)
- **Group expenses** (create group, add expense, settle) → **Cat 5**
- **Supabase sync** (cross-device tx history, contact resolver) → **Cat 5**
- **Phone-based contact lookup** (resolve phone → address) → **Cat 5**
- **Staking / DCA / Lending** (yield features) → **Cat 6**
- **Polished UI** (skeleton loaders, animations, custom icons, onboarding redesign) → **Cat 7**
- **Real AVNU Paymaster integration** (gasless for real) → **Cat 8** (grant)
- **iOS/Android native builds** → **Cat 8**

Cat 3 is done when: a user can log in, see real ERC20 balances on the home screen (even if 0), toggle between public/private QR codes on the receive screen, execute a public token transfer on the send screen, and see the transaction appear in their local history. The wallet is now functional — not just identifiable.
