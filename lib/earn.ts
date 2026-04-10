import type { Address, Amount, Token } from "starkzap";

// ─── Staking ─────────────────────────────────────────────────────────────────

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

// ─── DCA ─────────────────────────────────────────────────────────────────────

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

// ─── Lending ─────────────────────────────────────────────────────────────────

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
