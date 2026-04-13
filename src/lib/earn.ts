/**
 * Earn Types for SpiceUP
 * Type definitions for staking, DCA, and lending features
 */

/** A validator staking pool */
export interface StakerPool {
  poolContract: string;
  token: string;
  totalDelegated: string;
  validatorName: string;
  apyPercent: number | null;
  commission: number;
}

/** A user's position in a staking pool */
export interface StakedPosition {
  poolContract: string;
  validatorName: string;
  staked: string;
  rewards: string;
  unpooling: boolean;
}

/** DCA frequency option */
export type DcaFrequency = "Every 12h" | "Daily" | "Weekly";

/** DCA order status */
export type DcaOrderStatus = "ACTIVE" | "INDEXING" | "CANCELLED";

/** A DCA (Dollar Cost Averaging) order */
export interface AppDcaOrder {
  id: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  perCycleAmount: string;
  frequency: DcaFrequency;
  status: DcaOrderStatus;
  executedTrades: number;
  createdAt: number;
}

/** A lending market / pool */
export interface AppLendingMarket {
  poolId: string;
  poolName: string;
  token: string;
  totalDeposited: string;
  apyPercent: number;
}

/** A user's lending position */
export interface AppLendingPosition {
  poolId: string;
  poolName: string;
  token: string;
  depositedAmount: string;
  apyPercent: number;
}
