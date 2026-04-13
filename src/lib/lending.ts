/**
 * Mock Lending Module
 * Simulates lending markets and user positions
 */

import type { AppLendingMarket, AppLendingPosition } from "@/lib/earn";

/** Mock lending markets */
const MOCK_MARKETS: AppLendingMarket[] = [
  {
    poolId: "lend_usdc_01",
    poolName: "USDC Lending Pool",
    token: "USDC",
    totalDeposited: "12500000",
    apyPercent: 4.2,
  },
  {
    poolId: "lend_eth_01",
    poolName: "ETH Lending Pool",
    token: "ETH",
    totalDeposited: "4200",
    apyPercent: 3.1,
  },
];

/** Mock lending positions */
let MOCK_POSITIONS: AppLendingPosition[] = [
  {
    poolId: MOCK_MARKETS[0].poolId,
    poolName: MOCK_MARKETS[0].poolName,
    token: "USDC",
    depositedAmount: "500",
    apyPercent: MOCK_MARKETS[0].apyPercent,
  },
];

/** Get all available lending markets */
export async function getLendingMarkets(): Promise<AppLendingMarket[]> {
  await delay(800);
  return [...MOCK_MARKETS];
}

/** Get user's lending positions */
export async function getLendingPositions(): Promise<AppLendingPosition[]> {
  await delay(600);
  return [...MOCK_POSITIONS];
}

/** Deposit tokens into a lending pool. Returns updated position. */
export async function depositToLending(
  poolId: string,
  poolName: string,
  token: string,
  amount: string,
  apyPercent: number
): Promise<AppLendingPosition> {
  await delay(1500);

  const existing = MOCK_POSITIONS.find((p) => p.poolId === poolId);
  if (existing) {
    existing.depositedAmount = (
      parseFloat(existing.depositedAmount) + parseFloat(amount)
    ).toFixed(4);
    return { ...existing };
  }

  const newPos: AppLendingPosition = {
    poolId,
    poolName,
    token,
    depositedAmount: amount,
    apyPercent,
  };
  MOCK_POSITIONS.push(newPos);
  return { ...newPos };
}

/** Withdraw tokens from a lending pool. Returns updated position. */
export async function withdrawFromLending(
  poolId: string,
  amount: string
): Promise<{ withdrawn: string; remaining: string }> {
  await delay(1200);

  const pos = MOCK_POSITIONS.find((p) => p.poolId === poolId);
  if (!pos) throw new Error("Position not found");

  const current = parseFloat(pos.depositedAmount);
  const withdraw = parseFloat(amount);

  if (withdraw > current) throw new Error("Insufficient deposited balance");

  pos.depositedAmount = (current - withdraw).toFixed(4);

  // Remove position if fully withdrawn
  if (parseFloat(pos.depositedAmount) <= 0) {
    const idx = MOCK_POSITIONS.findIndex((p) => p.poolId === poolId);
    MOCK_POSITIONS.splice(idx, 1);
    return { withdrawn: amount, remaining: "0" };
  }

  return { withdrawn: amount, remaining: pos.depositedAmount };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
