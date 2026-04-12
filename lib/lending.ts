import type { OnboardResult, LendingMarket, LendingUserPosition } from "starkzap";
import type { Token, Address } from "starkzap";
import type { AppLendingPosition } from "@/lib/earn";
import { formatUsdValue } from "@/lib/format";

function Amount() {
  return (require("starkzap") as typeof import("starkzap")).Amount;
}

// ── Read ──────────────────────────────────────────────────────────────────────

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
      const token     = p.collateral.token;
      const rawAmount = p.collateral.amount ?? 0n;
      const deposited = Amount().fromRaw(rawAmount, token).toUnit().toString();
      const rawUsd    = p.collateral.usdValue;
      const usd       = formatUsdValue(typeof rawUsd === "bigint" ? rawUsd : undefined);

      // Match against market list for APY
      const market = markets.find((m) => m.poolAddress === p.pool.id);
      const apyRaw = market?.stats?.supplyApy;
      const apyPercent = apyRaw != null
        ? parseFloat(apyRaw.toUnit())
        : null;

      return {
        poolId:          p.pool.id,
        poolName:        p.pool.name ?? p.pool.id.slice(0, 10) + "\u2026",
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

// ── Transactions ──────────────────────────────────────────────────────────────

/** Deposit into the default lending pool for a given token (Vesu). */
export async function depositToLending(
  onboard: OnboardResult,
  token: Token,
  amountStr: string,
  poolAddress?: Address
) {
  return onboard.wallet.tx().lendDeposit({
    token,
    amount: Amount().parse(amountStr, token),
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
    amount: Amount().parse(amountStr, token),
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
