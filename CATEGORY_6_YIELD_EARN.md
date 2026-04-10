# Category 6 — Yield & Earn (Detailed Plan)

> **Goal**: Users can stake idle STRK to earn yield, set up DCA orders, deposit into lending pools, and view all earning positions in one screen.

---

## Context

- Categories 1–5 complete: Privy auth, Starkzap wallet, public/private transfers, fund/withdraw, group expenses with Supabase all working.
- `useAuthStore` has `wallet: OnboardResult` — the Starkzap wallet instance used for all on-chain transactions.
- `useWalletStore` has `balances: { STRK, ETH, USDC }` — public token balances already polled every 15s.
- `lib/txHistory.ts` stores `TxRecord` to AsyncStorage (200-record cap, newest-first). Category 6 adds earn-specific `type` values.
- `lib/format.ts` has `formatBalance()` and a `toFiat()` stub returning `"$—"` — stub remains, only `formatUsdValue()` for 1e18-scaled bigints is added.
- `getSdk()` singleton is exported from `lib/starkzap.ts` and used to access SDK-level methods like `getStakerPools()`.
- Starkzap v2 SDK ships typed `mainnetValidators` and `sepoliaValidators` objects, `DcaProvider`, and `VesuLendingProvider` — all available without extra packages.
- This category adds the earning surface on top of that foundation.

---

## 6.1 Types (`lib/earn.ts` — NEW)

> PRD: StakerPool + APY, StakedPosition, DCA orders, LendingPosition.

All earn-related types live in a single new `lib/earn.ts` file. No `types/` directory is added — consistent with existing pattern of types living alongside their logic.

```typescript
import type { Address, Amount, Token } from "starkzap";

// ─── Staking ────────────────────────────────────────────────────────────────

/**
 * App-level enriched pool: SDK Pool data + validator name/logo + optional APY.
 * apyPercent is null until an external staking API is wired (Cat 7).
 */
export interface StakerPool {
  poolContract: Address;
  token: Token;                  // always STRK for Starknet staking
  totalDelegated: Amount;        // total STRK in this pool
  validatorName: string;         // from curated validator preset (e.g. "Karnot")
  validatorLogoUrl: string | null;
  apyPercent: number | null;     // null — shown as "—" in UI
  commissionPercent: number | null;
}

/**
 * App-level staked position for one pool (user is a pool member).
 * Only returned for pools where the user has deposited.
 */
export interface StakedPosition {
  poolContract: Address;
  validatorName: string;
  staked: Amount;                // PoolMember.staked
  rewards: Amount;               // PoolMember.rewards — claimable now
  unpooling: Amount;             // PoolMember.unpooling — exit in progress
  unpoolTime: Date | null;       // PoolMember.unpoolTime — null if no exit intent
  commissionPercent: number;
}

// ─── DCA ────────────────────────────────────────────────────────────────────

/** Display-friendly frequency mapping to/from ISO 8601 duration strings. */
export type DcaFrequencyOption = {
  label: string;   // "Every 12h" | "Daily" | "Weekly"
  value: string;   // "PT12H"     | "P1D"   | "P1W"
};

/**
 * App-level DCA order derived from the SDK's DcaOrder shape.
 * Token fields are resolved from address via TOKEN_BY_ADDRESS.
 */
export interface AppDcaOrder {
  id: string;
  orderAddress: Address;
  sellToken: Token;
  buyToken: Token;
  sellAmountPerCycle: string;    // human-readable
  frequency: string;             // ISO 8601 value stored
  frequencyLabel: string;        // display label
  status: "ACTIVE" | "INDEXING" | "CLOSED";
  startDate: Date;
  endDate: Date;
  executedTradesCount: number;
  amountSold: string;            // human-readable total sold so far
  amountBought: string;          // human-readable total bought so far
}

// ─── Lending ────────────────────────────────────────────────────────────────

/**
 * App-level lending (earn) position.
 * Derived from LendingUserPosition where type === "earn".
 * usdValue is "$—" until a price oracle is wired.
 */
export interface AppLendingPosition {
  poolId: Address;
  poolName: string;
  token: Token;
  depositedAmount: string;       // human-readable (derived from collateral.amount bigint)
  apyPercent: number | null;     // from LendingMarket.stats.supplyApy — null on Sepolia
  usdValue: string;              // "$X.XX" or "$—"
}
```

---

## 6.2 Staking Library (`lib/staking.ts` — NEW)

> PRD: `wallet.getStakerPools()`, `wallet.tx().stake()`, `wallet.tx().claimRewards()`, `wallet.tx().exitPool()`

Thin wrappers over the Starkzap SDK staking methods. The SDK method is `sdk.getStakerPools(stakerAddress)` per validator — not a single global discovery call.

```typescript
import { getSdk } from "@/lib/starkzap";
import { Amount } from "starkzap";
import type { OnboardResult } from "starkzap";
import type { Address, Token } from "starkzap";
import type { StakerPool, StakedPosition } from "@/lib/earn";
import { CURATED_VALIDATORS } from "@/constants/validators";

// ── Pool discovery ────────────────────────────────────────────────────────────

/**
 * Fetch all pools across the curated validator list.
 * Uses Promise.allSettled so a single failing validator does not block the rest.
 */
export async function getValidatorPools(): Promise<StakerPool[]> {
  const sdk = getSdk();
  const results = await Promise.allSettled(
    CURATED_VALIDATORS.map(async (v) => {
      const pools = await sdk.getStakerPools(v.stakerAddress);
      return pools.map(
        (p): StakerPool => ({
          poolContract: p.poolContract,
          token: p.token,
          totalDelegated: p.amount,
          validatorName: v.name,
          validatorLogoUrl: v.logoUrl ?? null,
          apyPercent: null,          // wired in Cat 7
          commissionPercent: null,   // loaded per-pool when user taps stake
        })
      );
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<StakerPool[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

/**
 * Fetch the user's staked positions across pools.
 * Returns only pools where the user is a member (position != null).
 */
export async function getStakedPositions(
  wallet: OnboardResult["wallet"],
  pools: StakerPool[]
): Promise<StakedPosition[]> {
  const results = await Promise.allSettled(
    pools.map(async (p) => {
      const member = await wallet.getPoolPosition(p.poolContract);
      if (!member) return null;
      return {
        poolContract: p.poolContract,
        validatorName: p.validatorName,
        staked: member.staked,
        rewards: member.rewards,
        unpooling: member.unpooling,
        unpoolTime: member.unpoolTime ?? null,
        commissionPercent: member.commissionPercent,
      } satisfies StakedPosition;
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<StakedPosition | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is StakedPosition => v !== null);
}

// ── Transactions ─────────────────────────────────────────────────────────────

/** Stake STRK into a pool. */
export async function stakeInPool(
  onboard: OnboardResult,
  poolAddress: Address,
  amountStr: string,
  token: Token
) {
  const amount = Amount.parse(amountStr, token);
  return wallet.tx().stake(poolAddress, amount).send();
  // Note: SDK auto-detects first-time vs existing member via smart staking
}

/** Claim unclaimed staking rewards from a pool. */
export async function claimPoolRewards(
  onboard: OnboardResult,
  poolAddress: Address
) {
  return onboard.wallet.tx().claimPoolRewards(poolAddress).send();
}

/**
 * Submit exit intent for a staked position.
 * After this, the user must wait until position.unpoolTime, then call finalizeUnstake().
 */
export async function beginUnstake(
  onboard: OnboardResult,
  poolAddress: Address,
  amountStr: string,
  token: Token
) {
  const amount = Amount.parse(amountStr, token);
  return onboard.wallet.tx().exitPoolIntent(poolAddress, amount).send();
}

/**
 * Finalize unstake after the unbonding period has elapsed.
 * Only callable when Date.now() >= position.unpoolTime.
 */
export async function finalizeUnstake(
  onboard: OnboardResult,
  poolAddress: Address
) {
  return onboard.wallet.tx().exitPool(poolAddress).send();
}
```

---

## 6.3 DCA Library (`lib/dca.ts` — NEW)

> PRD: `wallet.tx().createDCA({ from, to, amount, frequency }).send()`, view orders, cancel.

The SDK uses `dcaCreate` / `dcaCancel` on the TxBuilder, with ISO 8601 frequency strings.

```typescript
import { Amount } from "starkzap";
import type { OnboardResult, DcaOrder } from "starkzap";
import type { Token, Address } from "starkzap";
import type { AppDcaOrder, DcaFrequencyOption } from "@/lib/earn";
import { TOKEN_BY_ADDRESS } from "@/constants/tokens";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DCA_FREQUENCY_OPTIONS: DcaFrequencyOption[] = [
  { label: "Every 12h", value: "PT12H" },
  { label: "Daily",     value: "P1D"   },
  { label: "Weekly",    value: "P1W"   },
];

export function frequencyToLabel(isoValue: string): string {
  return DCA_FREQUENCY_OPTIONS.find((o) => o.value === isoValue)?.label ?? isoValue;
}

// ── Token resolution ──────────────────────────────────────────────────────────

function resolveToken(address: Address): Token {
  return (
    TOKEN_BY_ADDRESS[address.toLowerCase()] ?? {
      address,
      symbol: address.slice(0, 8) + "…",
      name: "Unknown",
      decimals: 18,
    }
  );
}

// ── SDK order → AppDcaOrder ───────────────────────────────────────────────────

function mapOrder(o: DcaOrder): AppDcaOrder {
  const sellToken = resolveToken(o.sellTokenAddress);
  const buyToken  = resolveToken(o.buyTokenAddress);
  const perCycle  = o.sellAmountPerCycleBase !== undefined
    ? Amount.fromRaw(o.sellAmountPerCycleBase, sellToken).toUnit().toString()
    : "—";
  const sold    = o.amountSoldBase    ? Amount.fromRaw(o.amountSoldBase,    sellToken).toUnit().toString() : "0";
  const bought  = o.amountBoughtBase  ? Amount.fromRaw(o.amountBoughtBase,  buyToken).toUnit().toString()  : "0";

  return {
    id: o.id,
    orderAddress: o.orderAddress,
    sellToken,
    buyToken,
    sellAmountPerCycle: perCycle,
    frequency: o.frequency,
    frequencyLabel: frequencyToLabel(o.frequency),
    status: o.status as AppDcaOrder["status"],
    startDate: new Date(o.startDate),
    endDate: new Date(o.endDate),
    executedTradesCount: o.executedTradesCount ?? 0,
    amountSold: sold,
    amountBought: bought,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all ACTIVE DCA orders for the connected wallet.
 * Returns [] (never throws) if the DCA provider has no data (Sepolia).
 */
export async function getActiveDcaOrders(onboard: OnboardResult): Promise<AppDcaOrder[]> {
  try {
    const orders = await onboard.wallet.dca().getOrders({ status: "ACTIVE" });
    return orders.map(mapOrder);
  } catch {
    return [];
  }
}

/**
 * Create a new DCA order.
 * totalSellAmount: overall budget (e.g. "100" STRK).
 * perCycleSellAmount: amount per execution (e.g. "10" STRK per day).
 */
export async function createDcaOrder(
  onboard: OnboardResult,
  params: {
    sellToken: Token;
    buyToken: Token;
    totalSellAmount: string;
    perCycleSellAmount: string;
    frequency: string;           // ISO 8601: "P1D", "P1W", "PT12H"
  }
) {
  return onboard.wallet.tx().dcaCreate({
    sellToken: params.sellToken,
    buyToken:  params.buyToken,
    sellAmount:         Amount.parse(params.totalSellAmount,    params.sellToken),
    sellAmountPerCycle: Amount.parse(params.perCycleSellAmount, params.sellToken),
    frequency:          params.frequency,
  }).send();
}

/** Cancel an active DCA order. */
export async function cancelDcaOrder(
  onboard: OnboardResult,
  orderId: string,
  orderAddress: Address
) {
  return onboard.wallet.tx().dcaCancel({ orderId, orderAddress }).send();
}
```

---

## 6.4 Lending Library (`lib/lending.ts` — NEW)

> PRD: `wallet.tx().lendDeposit()`, `wallet.tx().lendWithdraw()`, show APY + deposited amount + accrued interest.

Uses the Vesu lending provider bundled with Starkzap v2. On Sepolia, `getMarkets()` returns an empty array — handled gracefully.

```typescript
import { Amount } from "starkzap";
import type { OnboardResult, LendingMarket, LendingUserPosition } from "starkzap";
import type { Token, Address } from "starkzap";
import type { AppLendingPosition } from "@/lib/earn";
import { formatUsdValue } from "@/lib/format";

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch available lending markets (Vesu).
 * Returns [] on Sepolia or when the provider has no data.
 */
export async function getLendingMarkets(onboard: OnboardResult): Promise<LendingMarket[]> {
  try {
    return await onboard.wallet.lending().getMarkets();
  } catch {
    return [];
  }
}

/**
 * Fetch the user's active lending (earn) positions.
 * Filters to type === "earn" only — borrow positions are out of scope for Cat 6.
 */
export async function getLendingPositions(
  onboard: OnboardResult,
  markets: LendingMarket[]
): Promise<AppLendingPosition[]> {
  try {
    const positions = await onboard.wallet.lending().getPositions();
    const earnPositions = positions.filter((p) => p.type === "earn");

    return earnPositions.map((p: LendingUserPosition): AppLendingPosition => {
      const token      = p.collateral.token;
      const rawAmount  = p.collateral.amount ?? 0n;
      const deposited  = Amount.fromRaw(rawAmount, token).toUnit().toString();
      const rawUsd     = p.collateral.usdValue;
      const usd        = formatUsdValue(typeof rawUsd === "bigint" ? rawUsd : undefined);

      // Match against market list for APY
      const market = markets.find((m) => m.id === p.pool.id);
      const apyRaw = market?.stats?.supplyApy;
      const apyPercent = apyRaw != null
        ? parseFloat(Amount.fromRaw(apyRaw, { decimals: 16, symbol: "PCT", name: "", address: "0x0" }).toUnit().toString())
        : null;

      return {
        poolId:          p.pool.id,
        poolName:        p.pool.name ?? p.pool.id.slice(0, 10) + "…",
        token,
        depositedAmount: deposited,
        apyPercent,
        usdValue: usd,
      };
    });
  } catch {
    return [];
  }
}

// ── Transactions ─────────────────────────────────────────────────────────────

/** Deposit into the default lending pool for a given token (Vesu). */
export async function depositToLending(
  onboard: OnboardResult,
  token: Token,
  amountStr: string,
  poolAddress?: Address
) {
  return onboard.wallet.tx().lendDeposit({
    token,
    amount: Amount.parse(amountStr, token),
    ...(poolAddress ? { poolAddress } : {}),
  }).send();
}

/** Withdraw a specific amount from a lending pool. */
export async function withdrawFromLending(
  onboard: OnboardResult,
  token: Token,
  amountStr: string,
  poolAddress?: Address
) {
  return onboard.wallet.tx().lendWithdraw({
    token,
    amount: Amount.parse(amountStr, token),
    ...(poolAddress ? { poolAddress } : {}),
  }).send();
}

/** Withdraw the entire deposited balance from a lending pool. */
export async function withdrawAllFromLending(
  onboard: OnboardResult,
  token: Token,
  poolAddress?: Address
) {
  return onboard.wallet.tx().lendWithdrawMax({
    token,
    ...(poolAddress ? { poolAddress } : {}),
  }).send();
}
```

---

## 6.5 Zustand Store (`stores/earn.ts` — NEW)

> Flat slice pattern matching `stores/wallet.ts` and `stores/groups.ts`.

```typescript
import { create } from "zustand";
import type { LendingMarket } from "starkzap";
import type { StakerPool, StakedPosition, AppDcaOrder, AppLendingPosition } from "@/lib/earn";

interface EarnState {
  // Staking
  pools: StakerPool[];
  stakedPositions: StakedPosition[];
  poolsLoading: boolean;
  poolsError: string | null;

  // DCA
  dcaOrders: AppDcaOrder[];
  dcaLoading: boolean;
  dcaError: string | null;

  // Lending
  lendingPositions: AppLendingPosition[];
  lendingMarkets: LendingMarket[];
  lendingLoading: boolean;
  lendingError: string | null;

  // Metadata
  lastUpdated: number | null;

  // Actions
  setPools: (pools: StakerPool[]) => void;
  setStakedPositions: (positions: StakedPosition[]) => void;
  setPoolsLoading: (v: boolean) => void;
  setPoolsError: (e: string | null) => void;
  setDcaOrders: (orders: AppDcaOrder[]) => void;
  setDcaLoading: (v: boolean) => void;
  setDcaError: (e: string | null) => void;
  setLendingPositions: (positions: AppLendingPosition[]) => void;
  setLendingMarkets: (markets: LendingMarket[]) => void;
  setLendingLoading: (v: boolean) => void;
  setLendingError: (e: string | null) => void;
  markUpdated: () => void;
}

export const useEarnStore = create<EarnState>((set) => ({
  pools: [],
  stakedPositions: [],
  poolsLoading: false,
  poolsError: null,

  dcaOrders: [],
  dcaLoading: false,
  dcaError: null,

  lendingPositions: [],
  lendingMarkets: [],
  lendingLoading: false,
  lendingError: null,

  lastUpdated: null,

  setPools:             (pools)     => set({ pools }),
  setStakedPositions:   (positions) => set({ stakedPositions: positions }),
  setPoolsLoading:      (v)         => set({ poolsLoading: v }),
  setPoolsError:        (e)         => set({ poolsError: e }),
  setDcaOrders:         (orders)    => set({ dcaOrders: orders }),
  setDcaLoading:        (v)         => set({ dcaLoading: v }),
  setDcaError:          (e)         => set({ dcaError: e }),
  setLendingPositions:  (positions) => set({ lendingPositions: positions }),
  setLendingMarkets:    (markets)   => set({ lendingMarkets: markets }),
  setLendingLoading:    (v)         => set({ lendingLoading: v }),
  setLendingError:      (e)         => set({ lendingError: e }),
  markUpdated:          ()          => set({ lastUpdated: Date.now() }),
}));
```

---

## 6.6 Hooks

> All three hooks match the 15s polling pattern established by `hooks/useBalance.ts`.

### `hooks/useStaking.ts` (NEW)

```typescript
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { getValidatorPools, getStakedPositions } from "@/lib/staking";

const POLL_INTERVAL = 15_000;

export function useStaking() {
  const onboard = useAuthStore((s) => s.wallet);
  const {
    setPools, setStakedPositions,
    setPoolsLoading, setPoolsError,
    markUpdated,
  } = useEarnStore();

  const fetchStaking = useCallback(async () => {
    if (!onboard) return;
    setPoolsLoading(true);
    try {
      const pools     = await getValidatorPools();
      const positions = await getStakedPositions(onboard.wallet, pools);
      setPools(pools);
      setStakedPositions(positions);
      setPoolsError(null);
      markUpdated();
    } catch (e: unknown) {
      setPoolsError(e instanceof Error ? e.message : String(e));
    } finally {
      setPoolsLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchStaking();
    const id = setInterval(fetchStaking, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStaking]);

  return { refetch: fetchStaking };
}
```

### `hooks/useDCA.ts` (NEW)

```typescript
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { getActiveDcaOrders } from "@/lib/dca";

const POLL_INTERVAL = 15_000;

export function useDCA() {
  const onboard = useAuthStore((s) => s.wallet);
  const { setDcaOrders, setDcaLoading, setDcaError } = useEarnStore();

  const fetchOrders = useCallback(async () => {
    if (!onboard) return;
    setDcaLoading(true);
    try {
      const orders = await getActiveDcaOrders(onboard);
      setDcaOrders(orders);
      setDcaError(null);
    } catch (e: unknown) {
      setDcaError(e instanceof Error ? e.message : String(e));
    } finally {
      setDcaLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchOrders]);

  return { refetch: fetchOrders };
}
```

### `hooks/useLending.ts` (NEW)

```typescript
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useEarnStore } from "@/stores/earn";
import { getLendingMarkets, getLendingPositions } from "@/lib/lending";

const POLL_INTERVAL = 15_000;

export function useLending() {
  const onboard = useAuthStore((s) => s.wallet);
  const {
    setLendingPositions, setLendingMarkets,
    setLendingLoading, setLendingError,
  } = useEarnStore();

  const fetchLending = useCallback(async () => {
    if (!onboard) return;
    setLendingLoading(true);
    try {
      const markets   = await getLendingMarkets(onboard);
      const positions = await getLendingPositions(onboard, markets);
      setLendingMarkets(markets);
      setLendingPositions(positions);
      setLendingError(null);
    } catch (e: unknown) {
      setLendingError(e instanceof Error ? e.message : String(e));
    } finally {
      setLendingLoading(false);
    }
  }, [onboard]);

  useEffect(() => {
    fetchLending();
    const id = setInterval(fetchLending, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchLending]);

  return { refetch: fetchLending };
}
```

---

## 6.7 Components

### `components/PoolCard.tsx` (NEW)

Props: `pool: StakerPool`, `position: StakedPosition | null`, `onStake: () => void`, `onClaim: () => void`, `onUnstake: () => void`

Layout (NativeWind):
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Karnot Validator          APY: —     7% fee│
│          Total: 2,450,000 STRK                      │
│  ─ ─ ─ ─ ─ ─ ─ ─  (if position) ─ ─ ─ ─ ─ ─ ─ ─  │
│  Your stake: 100 STRK    Rewards: 1.23 STRK         │
│  [ Claim Rewards ]              [ Unstake ]         │
└─────────────────────────────────────────────────────┘
  [ + Stake more STRK ]   ← shown when position exists
  [ Stake STRK ]          ← shown when no position
```

- "Claim Rewards" button: `disabled={position.rewards.isZero()}` — grey when no rewards
- "APY" label: always `"—"` (Cat 6 stub); will be wired in Cat 7
- Entire card is `bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-3`

### `components/EarnPositionCard.tsx` (NEW)

Generic card for a user's active position. Used by staking and lending lists.

Props: `title: string`, `subtitle: string`, `apyLabel: string`, `balanceLabel: string`, `badgeLabel?: string`, `onPrimaryAction: () => void`, `primaryActionLabel: string`, `onSecondaryAction?: () => void`, `secondaryActionLabel?: string`

### `components/DcaOrderCard.tsx` (NEW)

Props: `order: AppDcaOrder`, `onCancel: () => void`, `cancelling: boolean`

Layout:
```
┌────────────────────────────────────────────────────┐
│  STRK → ETH          Daily              [ACTIVE]   │
│  10 STRK per cycle   Executed: 3 trades            │
│  Sold: 30 STRK  /  Bought: 0.012 ETH               │
│                              [ Cancel Order ]      │
└────────────────────────────────────────────────────┘
```

- Status badge: green `bg-green-900/40 text-green-400` for ACTIVE, yellow for INDEXING
- "Cancel Order" button shows `<ActivityIndicator>` when `cancelling === true`

### `components/LendingMarketCard.tsx` (NEW)

Props: `market: LendingMarket`, `position: AppLendingPosition | null`, `onDeposit: () => void`, `onWithdraw: () => void`

Layout:
```
┌────────────────────────────────────────────────────┐
│  USDC  —  Vesu              APY: 4.2%              │
│  ─ ─ ─ ─ ─ ─ (if position) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Deposited: 500 USDC                     $500.00   │
│  [ Deposit More ]                 [ Withdraw ]     │
└────────────────────────────────────────────────────┘
  [ Deposit USDC ]  ← shown when no position
```

### `components/EarnSummaryCard.tsx` (NEW)

Props: `stakedPositions: StakedPosition[]`, `lendingPositions: AppLendingPosition[]`

Displays totals across all positions:
```
┌────────────────────────────────────────────────────┐
│  Total Earning                             $—      │
│  Staked: 100 STRK    Lent: 500 USDC                │
│  Rewards claimable: 1.23 STRK                      │
└────────────────────────────────────────────────────┘
```

- USD value: `"$—"` — `toFiat()` stub, consistent with home screen
- Total STRK staked: sum of all `position.staked` amounts, formatted via `formatBalance()`
- Total rewards: sum of all `position.rewards`

### `components/FrequencySelector.tsx` (NEW)

Horizontal segmented picker for DCA frequency.

Props: `options: DcaFrequencyOption[]`, `selected: string`, `onSelect: (value: string) => void`

```tsx
// Renders as a row of tappable chips:
// [ Every 12h ]  [ Daily ]  [ Weekly ]
// Selected chip: bg-purple-700, others: bg-neutral-800
```

---

## 6.8 Screens

All action screens are accessible via `router.push` and hidden from the tab bar (`href: null`). All stage machines follow the `"input" → "reviewing" → "action" → "done"` convention established in Cat 3 and 4.

---

### `app/(app)/earn.tsx` (NEW) — Main Earn Hub

This is the only new **tab** screen. It hosts three manual sub-tabs (internal `useState`, not expo-router tabs — identical to how `send.tsx` uses a mode toggle).

```typescript
type EarnTab = "staking" | "dca" | "lending";
const [activeTab, setActiveTab] = useState<EarnTab>("staking");
```

**Hooks mounted**: `useStaking()`, `useDCA()`, `useLending()` — all three poll on mount.

**Auth guard**: `if (status !== "ready") return <ActivityIndicator />` (same pattern as `home.tsx`).

**Structure**:
```
<SafeAreaView bg-black>
  <EarnSummaryCard ... />

  {/* Tab toggle */}
  <View className="flex-row bg-neutral-900 rounded-xl mx-4 mb-4 p-1">
    { ["staking","dca","lending"].map(tab => <TabChip ... />) }
  </View>

  {/* Staking tab */}
  { activeTab === "staking" && (
    <ScrollView>
      {poolsError && <ErrorBanner message={poolsError} />}
      {pools.map(pool => (
        <PoolCard
          pool={pool}
          position={stakedPositions.find(p => p.poolContract === pool.poolContract) ?? null}
          onStake={() => router.push({ pathname: "/(app)/stake", params: { poolAddress: pool.poolContract } })}
          onClaim={() => router.push({ pathname: "/(app)/claim", params: { poolAddress: pool.poolContract } })}
          onUnstake={() => router.push({ pathname: "/(app)/unstake", params: { poolAddress: pool.poolContract } })}
        />
      ))}
      {pools.length === 0 && !poolsLoading && <EmptyState text="No staking pools available" />}
    </ScrollView>
  )}

  {/* DCA tab */}
  { activeTab === "dca" && (
    <ScrollView>
      {dcaOrders.map(order => <DcaOrderCard order={order} ... />)}
      {dcaOrders.length === 0 && !dcaLoading && <EmptyState text="No active DCA orders" />}
      <Button label="+ New DCA Order" onPress={() => router.push("/(app)/dca-create")} />
    </ScrollView>
  )}

  {/* Lending tab */}
  { activeTab === "lending" && (
    <ScrollView>
      {lendingMarkets.length === 0 && !lendingLoading && (
        <EmptyState text="Lending not available on testnet" />
      )}
      {lendingMarkets.map(market => (
        <LendingMarketCard
          market={market}
          position={lendingPositions.find(p => p.poolId === market.id) ?? null}
          onDeposit={() => router.push({ pathname: "/(app)/lend-deposit", params: { poolId: market.id } })}
          onWithdraw={() => router.push({ pathname: "/(app)/lend-withdraw", params: { poolId: market.id } })}
        />
      ))}
    </ScrollView>
  )}
</SafeAreaView>
```

---

### `app/(app)/stake.tsx` (NEW)

**Route params**: `poolAddress: string` (required)

**Stage machine**: `"input" → "reviewing" → "staking" → "done"`

```
input:
  Pool info card (name, total delegated, APY "—")
  AmountInput (STRK only — staking is STRK-only on Starknet)
  [ Review Stake ] button (disabled when amount empty)

reviewing:
  Summary card: pool name, amount, "Will be staked"
  Preflight: wallet.tx().stake(poolAddress, amount).preflight()
    → shows "Preflight passed" or Alert(reason) → back to input
  [ Confirm & Stake ] button
  [ ← Back ] → back to input

staking:
  <ActivityIndicator color="#7B5EA7" />
  <Text>"Staking STRK..."</Text>
  (non-cancellable — tx submitted)

done:
  Green checkmark
  "100 STRK staked with Karnot Validator"
  txHash (shortened) + explorer link
  [ Back to Earn ] → router.replace("/(app)/earn")
```

**Transaction recording**:
```typescript
saveTx({ type: "stake", amount: amountStr, token: "STRK", counterparty: poolAddress, isPrivate: false, txHash: tx.hash, timestamp: Date.now() });
```

---

### `app/(app)/unstake.tsx` (NEW)

**Route params**: `poolAddress: string`

Two sub-flows depending on the current position state:

**Sub-flow A — Submit Exit Intent** (when `position.unpooling.isZero()`):

Stage machine: `"input" → "reviewing" → "unstaking" → "done_intent"`

```
input:
  Shows current staked amount
  AmountInput (STRK, max = position.staked)
  Info banner: "You will need to wait for the unbonding period before claiming."
  [ Review Unstake ] button

reviewing:
  Summary: "Unstake X STRK from Karnot"
  Preflight via wallet.tx().exitPoolIntent(poolAddress, amount).preflight()
  [ Confirm Unstake Intent ]

unstaking:
  <ActivityIndicator /> "Submitting exit intent..."

done_intent:
  "Exit intent submitted"
  "Estimated wait: ~21 days. Return to complete your unstake."
  [ Back to Earn ]
```

**Sub-flow B — Finalize Unstake** (when `position.unpooling > 0` AND `Date.now() >= position.unpoolTime`):

Stage machine: `"reviewing" → "finalizing" → "done"`

```
reviewing:
  "Your unstake of X STRK is ready to complete."
  [ Complete Unstake ] button

finalizing:
  <ActivityIndicator /> "Finalizing..."

done:
  "X STRK returned to your wallet"
  [ Back to Earn ]
```

**Screen startup logic**:
```typescript
// On mount: fetch position to determine which sub-flow to show
const position = stakedPositions.find(p => p.poolContract === poolAddress);
const canFinalize = position?.unpoolTime !== null && new Date() >= position.unpoolTime!;
```

**Transaction recording**: `type: "unstake_intent"` for sub-flow A, `type: "unstake"` for sub-flow B.

---

### `app/(app)/claim.tsx` (NEW)

**Route params**: `poolAddress: string`

Stage machine: `"reviewing" → "claiming" → "done"` (no input — claim always claims all rewards)

```
reviewing:
  Position card showing rewards: "1.23 STRK claimable"
  [ Claim Rewards ] button
  [ ← Back ]

claiming:
  <ActivityIndicator /> "Claiming rewards..."

done:
  "1.23 STRK claimed"
  txHash + explorer link
  [ Back to Earn ]
```

**Guard**: Screen navigates back immediately if `position === undefined || position.rewards.isZero()` (rewards button on `PoolCard` is already disabled in this case, but guard added as safety net).

**Transaction recording**: `type: "claim_rewards"`, `counterparty: poolAddress`.

---

### `app/(app)/dca-create.tsx` (NEW)

**Route params**: none

Stage machine: `"input" → "reviewing" → "creating" → "done"`

```
input:
  Header: "New DCA Order"
  Sell token selector (TokenSelector — ETH, STRK, USDC)
  Buy token selector (TokenSelector — ETH, STRK, USDC, excluding sell token)
  AmountInput: "Total budget" (total sell amount)
  AmountInput: "Per cycle" (per-cycle sell amount)
  FrequencySelector (Every 12h | Daily | Weekly)
  Validation: per-cycle must be <= total budget
  [ Review Order ] button

reviewing:
  Summary card:
    "Buy ETH with STRK"
    "10 STRK per day"
    "Total budget: 100 STRK → ~10 cycles"
  Preflight: wallet.tx().dcaCreate(request).preflight()
  [ Confirm & Create ] button

creating:
  <ActivityIndicator /> "Creating DCA order..."

done:
  "DCA order created"
  "Your 10 STRK/day buy order is now active"
  [ Back to Earn ]
```

**Transaction recording**: `type: "dca_create"`, `counterparty: "dca"`, `amount: totalSellAmount`, `token: sellToken.symbol`.

---

### `app/(app)/lend-deposit.tsx` (NEW)

**Route params**: `poolId?: string` (optional — deep-linked from a specific market)

Stage machine: `"input" → "reviewing" → "depositing" → "done"`

```
input:
  Header: "Deposit to Earn"
  TokenSelector (ETH, STRK, USDC)
  If market found for selected token: shows APY banner "Earning ~4.2% APY"
  If Sepolia: shows info banner "APY data unavailable on testnet"
  AmountInput
  [ Review Deposit ] button

reviewing:
  Summary: "Deposit 500 USDC to Vesu lending pool"
  APY: "4.2% APY" (or "—" on Sepolia)
  Preflight: wallet.tx().lendDeposit(request).preflight()
  [ Confirm Deposit ]

depositing:
  <ActivityIndicator /> "Depositing..."

done:
  "500 USDC deposited"
  "Earning ~4.2% APY"
  [ Back to Earn ]
```

**Transaction recording**: `type: "lend_deposit"`, `counterparty: poolId ?? "vesu"`.

---

### `app/(app)/lend-withdraw.tsx` (NEW)

**Route params**: `poolId: string` (required — must have a position)

Stage machine: `"input" → "reviewing" → "withdrawing" → "done"`

```
input:
  Header: "Withdraw from Lending"
  Shows current deposited: "500 USDC deposited"
  AmountInput (max = position.depositedAmount)
  "Withdraw All" shortcut button → sets amount to max
  [ Review Withdrawal ] button

reviewing:
  Summary: "Withdraw 500 USDC"
  Preflight: wallet.tx().lendWithdraw(request).preflight()
  (or lendWithdrawMax for full withdrawal)
  [ Confirm Withdrawal ]

withdrawing:
  <ActivityIndicator /> "Withdrawing..."

done:
  "500 USDC returned to your wallet"
  [ Back to Earn ]
```

**Transaction recording**: `type: "lend_withdraw"`, `counterparty: poolId`.

---

## 6.9 Tab Bar Update (`app/(app)/_layout.tsx` — EXTEND)

Add the Earn tab and register all action screens as hidden routes.

```tsx
// Add after Groups tab:
<Tabs.Screen
  name="earn"
  options={{
    title: "Earn",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="trending-up-outline" size={size} color={color} />
    ),
  }}
/>

// Hidden action screens (no tab bar item):
<Tabs.Screen name="stake"        options={{ href: null }} />
<Tabs.Screen name="unstake"      options={{ href: null }} />
<Tabs.Screen name="claim"        options={{ href: null }} />
<Tabs.Screen name="dca-create"   options={{ href: null }} />
<Tabs.Screen name="lend-deposit" options={{ href: null }} />
<Tabs.Screen name="lend-withdraw" options={{ href: null }} />
```

---

## 6.10 `lib/format.ts` Extension

Add `formatUsdValue()` for the 1e18-scaled bigint USD values returned by Vesu positions.

```typescript
/**
 * Format a 1e18-scaled bigint USD value (from Vesu LendingUserPosition.collateral.usdValue).
 * Returns "$—" when value is undefined or zero.
 */
export function formatUsdValue(raw1e18: bigint | undefined): string {
  if (raw1e18 === undefined || raw1e18 === 0n) return "$—";
  const usd = Number(raw1e18) / 1e18;
  return `$${usd.toFixed(2)}`;
}
```

---

## 6.11 `constants/validators.ts` (NEW)

Curated validator whitelist to avoid listing ~100 validators from the SDK.

```typescript
import { mainnetValidators, sepoliaValidators } from "starkzap";
import { ENV } from "@/lib/env";

type ValidatorPreset = {
  name: string;
  stakerAddress: string;
  logoUrl: string | null;
};

const MAINNET_CURATED: ValidatorPreset[] = [
  { name: "Karnot",          stakerAddress: mainnetValidators.KARNOT?.stakerAddress      ?? "0x0", logoUrl: null },
  { name: "AVNU",            stakerAddress: mainnetValidators.AVNU?.stakerAddress         ?? "0x0", logoUrl: null },
  { name: "Braavos",         stakerAddress: mainnetValidators.BRAAVOS?.stakerAddress      ?? "0x0", logoUrl: null },
  { name: "Nethermind",      stakerAddress: mainnetValidators.NETHERMIND?.stakerAddress   ?? "0x0", logoUrl: null },
  { name: "Simply Staking",  stakerAddress: mainnetValidators.SIMPLY_STAKING?.stakerAddress ?? "0x0", logoUrl: null },
].filter((v) => v.stakerAddress !== "0x0");

const SEPOLIA_CURATED: ValidatorPreset[] = Object.entries(sepoliaValidators)
  .slice(0, 5)
  .map(([name, v]) => ({
    name,
    stakerAddress: v.stakerAddress,
    logoUrl: null,
  }));

export const CURATED_VALIDATORS: ValidatorPreset[] =
  ENV.NETWORK === "mainnet" ? MAINNET_CURATED : SEPOLIA_CURATED;
```

---

## 6.12 `constants/tokens.ts` Extension

Add a reverse address-to-Token lookup used by `lib/dca.ts` to resolve DCA order token addresses.

```typescript
// Add to existing tokens.ts (after ALL_TOKENS is defined):

export const TOKEN_BY_ADDRESS: Record<string, Token> = Object.fromEntries(
  ALL_TOKENS.map((t) => [t.address.toLowerCase(), t])
);
```

This requires that `ALL_TOKENS` is already an array of all token definitions. If it isn't exported, export it:
```typescript
export const ALL_TOKENS: Token[] = [STRK, ETH, USDC];
```

---

## 6.13 `lib/txHistory.ts` Extension

Extend the `TxRecord.type` union to cover earn operations. No other fields change.

```typescript
// Existing type:
export interface TxRecord {
  id: string;
  type:
    | "send" | "receive" | "fund" | "withdraw" | "rollover"  // existing
    | "stake" | "unstake_intent" | "unstake"                   // staking
    | "claim_rewards"                                          // staking rewards
    | "dca_create" | "dca_cancel"                             // DCA
    | "lend_deposit" | "lend_withdraw";                        // lending
  amount: string;
  token: string;
  counterparty: string;
  timestamp: number;
  txHash: string;
  isPrivate: boolean;
}
```

**`components/TransactionItem.tsx`** — extend the sign/color logic for new types:

| Type | Display sign | Color |
|---|---|---|
| `stake`, `lend_deposit`, `dca_create` | `−` outbound | red `text-red-400` |
| `unstake`, `lend_withdraw`, `claim_rewards` | `+` inbound | green `text-green-400` |
| `unstake_intent` | `⟳` pending | grey `text-neutral-400` |
| `dca_cancel` | neutral | grey |

---

## Files Modified / Created

| File | Action | Maps to |
|---|---|---|
| `lib/earn.ts` | NEW | 6.1 |
| `lib/staking.ts` | NEW | 6.2 |
| `lib/dca.ts` | NEW | 6.3 |
| `lib/lending.ts` | NEW | 6.4 |
| `stores/earn.ts` | NEW | 6.5 |
| `hooks/useStaking.ts` | NEW | 6.6 |
| `hooks/useDCA.ts` | NEW | 6.6 |
| `hooks/useLending.ts` | NEW | 6.6 |
| `components/PoolCard.tsx` | NEW | 6.7 |
| `components/EarnPositionCard.tsx` | NEW | 6.7 |
| `components/DcaOrderCard.tsx` | NEW | 6.7 |
| `components/LendingMarketCard.tsx` | NEW | 6.7 |
| `components/EarnSummaryCard.tsx` | NEW | 6.7 |
| `components/FrequencySelector.tsx` | NEW | 6.7 |
| `app/(app)/earn.tsx` | NEW | 6.8 |
| `app/(app)/stake.tsx` | NEW | 6.8 |
| `app/(app)/unstake.tsx` | NEW | 6.8 |
| `app/(app)/claim.tsx` | NEW | 6.8 |
| `app/(app)/dca-create.tsx` | NEW | 6.8 |
| `app/(app)/lend-deposit.tsx` | NEW | 6.8 |
| `app/(app)/lend-withdraw.tsx` | NEW | 6.8 |
| `app/(app)/_layout.tsx` | EXTEND | 6.9 |
| `lib/format.ts` | EXTEND | 6.10 |
| `constants/validators.ts` | NEW | 6.11 |
| `constants/tokens.ts` | EXTEND | 6.12 |
| `lib/txHistory.ts` | EXTEND | 6.13 |
| `components/TransactionItem.tsx` | EXTEND | 6.13 |

---

## SDK Types Reference

```typescript
// ── Staking ─────────────────────────────────────────────────────────────────

// sdk.getStakerPools(stakerAddress: Address): Promise<Pool[]>
interface Pool {
  poolContract: Address;
  token: Token;
  amount: Amount;     // total delegated
}

// wallet.getPoolPosition(poolContract: Address): Promise<PoolMember | null>
interface PoolMember {
  staked: Amount;
  rewards: Amount;
  unpooling: Amount;
  unpoolTime: Date | null;
  commissionPercent: number;
}

// TxBuilder staking methods — all return TxBuilder (supports .preflight() and .send())
wallet.tx().stake(poolAddress: Address, amount: Amount): TxBuilder
wallet.tx().claimPoolRewards(poolAddress: Address): TxBuilder
wallet.tx().exitPoolIntent(poolAddress: Address, amount: Amount): TxBuilder
wallet.tx().exitPool(poolAddress: Address): TxBuilder

// ── DCA ─────────────────────────────────────────────────────────────────────

// wallet.dca().getOrders({ status: "ACTIVE" | "CLOSED" }): Promise<DcaOrder[]>
interface DcaOrder {
  id: string;
  orderAddress: Address;
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  sellAmountBase: bigint;
  sellAmountPerCycleBase: bigint | undefined;
  amountSoldBase: bigint | undefined;
  amountBoughtBase: bigint | undefined;
  frequency: string;          // ISO 8601 duration
  status: string;             // "ACTIVE" | "INDEXING" | "CLOSED"
  startDate: string;          // ISO date string
  endDate: string;
  executedTradesCount: number | undefined;
}

// TxBuilder DCA methods
wallet.tx().dcaCreate({
  sellToken: Token,
  buyToken: Token,
  sellAmount: Amount,
  sellAmountPerCycle: Amount,
  frequency: string,          // ISO 8601
}): TxBuilder

wallet.tx().dcaCancel({
  orderId: string,
  orderAddress: Address,
}): TxBuilder

// ── Lending ─────────────────────────────────────────────────────────────────

// wallet.lending().getMarkets(): Promise<LendingMarket[]>
interface LendingMarket {
  id: Address;
  name?: string;
  token: Token;
  stats?: {
    supplyApy?: Amount;        // APY as Amount on 1e16 scale (1e16 = 1%)
    totalDeposited?: Amount;
  };
}

// wallet.lending().getPositions(): Promise<LendingUserPosition[]>
interface LendingUserPosition {
  type: "earn" | "borrow";
  pool: { id: Address; name?: string };
  collateral: {
    token: Token;
    amount: bigint;            // raw bigint, NOT Amount — wrap with Amount.fromRaw()
    usdValue?: bigint;         // 1e18-scaled USD value
  };
}

// TxBuilder lending methods
wallet.tx().lendDeposit({ token: Token, amount: Amount, poolAddress?: Address }): TxBuilder
wallet.tx().lendWithdraw({ token: Token, amount: Amount, poolAddress?: Address }): TxBuilder
wallet.tx().lendWithdrawMax({ token: Token, poolAddress?: Address }): TxBuilder
```

---

## Edge Cases & Guards

| Scenario | Guard |
|---|---|
| `sdk.getStakerPools()` fails for a validator | `Promise.allSettled` — other validators still load; failing validator skipped |
| No staked positions (new user) | `getStakedPositions` returns `[]`; Earn screen shows only pool list with "Stake" CTAs |
| `PoolMember.rewards.isZero()` | "Claim Rewards" button is `disabled`; `claim.tsx` also guards on mount |
| `position.unpoolTime === null` with `unpooling > 0` | SDK edge case — hide "Complete Unstake" button; only show when `unpoolTime !== null` |
| DCA provider on Sepolia returns empty | `getActiveDcaOrders` catches and returns `[]`; DCA tab shows empty state |
| DCA `sellAmountPerCycleBase` is `undefined` | Shown as `"—"` in `DcaOrderCard` |
| `lendDeposit` with no Vesu market for token | `lendDeposit` sends to default pool; SDK fills poolAddress |
| `getLendingMarkets()` returns `[]` on Sepolia | Lending tab shows "Lending not available on testnet" empty state |
| `LendingUserPosition.collateral.usdValue` is `undefined` | `formatUsdValue(undefined)` returns `"$—"` |
| APY `supplyApy` Amount scale (1e16 = 1%) | Parsed as: `Amount.fromRaw(apyRaw, { decimals: 16 }).toUnit()` gives percentage as float |
| All three hooks polling simultaneously | Each has its own 15s interval; no shared timer; acceptable RPC load on testnet |
| Earn screen mounted without `status === "ready"` | `if (status !== "ready") return <ActivityIndicator />` guard at screen top |
| `TOKEN_BY_ADDRESS` lookup miss for unknown DCA token | `resolveToken()` returns a stub Token with address-as-symbol; user sees address prefix |
| Amount parse fails (empty/invalid input) | `Amount.parse` throws — caught in screen's action handler → `Alert.alert("Invalid amount", ...)` |
| Double-submit on any action screen | Stage machine: action buttons only exist in `"input"` and `"reviewing"` stages |
| 6-tab overflow on small screens | Acceptable for Cat 6; screen real estate review deferred to Cat 7 UI Polish |

---

## Verification Checklist

```bash
npx tsc --noEmit
# Expect: 0 errors
```

### 6.1 — Types

- `lib/earn.ts` imports cleanly from `starkzap` with no TS errors
- All type fields used in lib and store files typecheck correctly

### 6.2 — Staking

- [ ] `getValidatorPools()` returns at least one pool on Sepolia (using `sepoliaValidators`)
- [ ] `getStakedPositions()` returns `[]` for a new wallet with no positions
- [ ] `stakeInPool()` completes successfully with a small STRK amount on Sepolia
- [ ] `beginUnstake()` submits intent; subsequent `getStakedPositions()` shows `unpooling > 0`
- [ ] `finalizeUnstake()` callable after `unpoolTime` elapses
- [ ] `claimPoolRewards()` reverts gracefully (handled as `Alert`) when no rewards exist

### 6.3 — DCA

- [ ] `DCA_FREQUENCY_OPTIONS` renders correctly in `FrequencySelector`
- [ ] `frequencyToLabel("P1D")` returns `"Daily"`, `"PT12H"` returns `"Every 12h"`
- [ ] `createDcaOrder()` succeeds on testnet (if AVNU DCA is active on Sepolia)
- [ ] `getActiveDcaOrders()` returns `[]` without throwing on testnet
- [ ] `DcaOrderCard` renders `"INDEXING"` badge immediately after creation
- [ ] `cancelDcaOrder()` removes the order from the next `getActiveDcaOrders()` call

### 6.4 — Lending

- [ ] `getLendingMarkets()` returns `[]` on Sepolia without error
- [ ] Lending tab shows "Lending not available on testnet" empty state on Sepolia
- [ ] `getLendingPositions()` returns `[]` for new wallet without throwing
- [ ] `depositToLending()` succeeds on mainnet with a small USDC amount
- [ ] `LendingMarketCard` shows APY from `market.stats.supplyApy` on mainnet
- [ ] `formatUsdValue(1_000_000_000_000_000_000n)` returns `"$1.00"`

### 6.5 — Store

- [ ] `useEarnStore` state initializes with all empty arrays and `false` loading flags
- [ ] Setting pools updates only `pools` key; other slices unchanged (Zustand isolation)

### 6.6 — Hooks

- [ ] `useStaking` fires on mount and refires after 15s (verify with console.log)
- [ ] `useDCA` and `useLending` follow same pattern
- [ ] Unmounting earn screen clears all three intervals (no memory leak)

### 6.7 — Components

- [ ] `PoolCard` renders without position: shows "Stake STRK" button only
- [ ] `PoolCard` renders with position: shows staked amount, rewards, Claim/Unstake buttons
- [ ] `DcaOrderCard` "Cancel Order" button shows spinner during `cancelling === true`
- [ ] `LendingMarketCard` "Deposit" button shown when no position; "Deposit More" + "Withdraw" when position exists
- [ ] `EarnSummaryCard` totals sum correctly across multiple staked positions
- [ ] `FrequencySelector` highlights selected option with `bg-purple-700`

### 6.8 — Screens

- [ ] Earn tab loads without crash; all three sub-tabs toggle correctly
- [ ] `stake.tsx`: preflight runs in "reviewing" stage; "Confirm & Stake" is blocked until preflight returns
- [ ] `unstake.tsx`: shows Sub-flow A when `unpooling.isZero()`; shows Sub-flow B when `unpoolTime <= now`
- [ ] `claim.tsx`: navigates back immediately if rewards are zero
- [ ] `dca-create.tsx`: "Review Order" blocked when per-cycle amount > total budget
- [ ] `lend-deposit.tsx`: APY banner hidden on Sepolia, shown on mainnet
- [ ] `lend-withdraw.tsx`: "Withdraw All" sets input to `position.depositedAmount`
- [ ] All done screens use `router.replace("/(app)/earn")` not `router.back()` (prevents double-back into action screen)

### 6.9 — Tab Bar

- [ ] Earn tab appears in tab bar with `trending-up-outline` icon
- [ ] Home, Send, Receive, Groups, Settings tabs all still present and navigable
- [ ] Action screens (stake, unstake, etc.) do not appear as tab bar items

### 6.13 — Transaction History

- [ ] `stake` TxRecord appears in home screen "Recent Activity" feed after staking
- [ ] `claim_rewards` TxRecord shows green `+` badge in TransactionItem
- [ ] `unstake_intent` TxRecord shows neutral grey styling (no sign)
- [ ] `npx tsc --noEmit` confirms no union type errors on the extended `type` field

---

## What's NOT in Category 6

Deferred to later categories:

- **Live APY data**: External staking API (e.g. Voyager `/beta/staking`) wired to `apyPercent` — deferred to Cat 7
- **Fiat price conversion**: `toFiat()` stub remains; USD amounts shown as `"$—"` except Vesu's own bigint USD value — price oracle deferred to Cat 7
- **Auto-compound staking rewards**: Automatically claim + re-stake rewards on a schedule — deferred to Cat 7
- **Borrow positions** in lending: `type === "borrow"` positions filtered out — out of scope entirely
- **Bridging**: PRD mentions "one app: send, split, earn, bridge" — bridge flow is a separate feature, not part of Cat 6
- **Push notifications for DCA executions**: notify when a DCA cycle executes — deferred to Cat 7
- **Validator APY commission breakdown UX**: loading commission per-pool on stake screen detail — deferred to Cat 7
- **Unit tests** for `lib/staking.ts`, `lib/dca.ts`, `lib/lending.ts` — deferred to Cat 8
- **Integration tests** for stake flow end-to-end on Sepolia — deferred to Cat 8
