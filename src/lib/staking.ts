/**
 * Mock Staking Module
 * Simulates validator staking pools and user positions
 */

import type { StakerPool, StakedPosition } from "@/lib/earn";

/** Mock validator pools */
const MOCK_POOLS: StakerPool[] = [
  {
    poolContract: "0x01a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678",
    token: "STRK",
    totalDelegated: "2450000",
    validatorName: "Starknet Sentinel",
    apyPercent: 5.2,
    commission: 10,
  },
  {
    poolContract: "0x02b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
    token: "STRK",
    totalDelegated: "1870000",
    validatorName: "Void Validator",
    apyPercent: 4.8,
    commission: 8,
  },
  {
    poolContract: "0x03c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456789012",
    token: "STRK",
    totalDelegated: "920000",
    validatorName: "StrkFi Pool",
    apyPercent: null,
    commission: 12,
  },
];

/** Mock staked positions */
let MOCK_POSITIONS: StakedPosition[] = [
  {
    poolContract: MOCK_POOLS[0].poolContract,
    validatorName: MOCK_POOLS[0].validatorName,
    staked: "100",
    rewards: "1.23",
    unpooling: false,
  },
];

/** Get all available validator pools */
export async function getValidatorPools(): Promise<StakerPool[]> {
  await delay(800);
  return [...MOCK_POOLS];
}

/** Get user's staked positions */
export async function getStakedPositions(): Promise<StakedPosition[]> {
  await delay(600);
  return [...MOCK_POSITIONS];
}

/** Stake tokens into a pool. Returns updated position. */
export async function stakeInPool(
  poolContract: string,
  validatorName: string,
  amount: string
): Promise<StakedPosition> {
  await delay(1500);

  const existing = MOCK_POSITIONS.find(
    (p) => p.poolContract === poolContract
  );
  if (existing) {
    existing.staked = (parseFloat(existing.staked) + parseFloat(amount)).toFixed(
      4
    );
    return { ...existing };
  }

  const newPos: StakedPosition = {
    poolContract,
    validatorName,
    staked: amount,
    rewards: "0",
    unpooling: false,
  };
  MOCK_POSITIONS.push(newPos);
  return { ...newPos };
}

/** Claim rewards from a pool. Returns updated position. */
export async function claimPoolRewards(
  poolContract: string
): Promise<{ claimed: string }> {
  await delay(1200);

  const pos = MOCK_POSITIONS.find((p) => p.poolContract === poolContract);
  if (!pos) throw new Error("Position not found");

  const claimed = pos.rewards;
  pos.rewards = "0";
  return { claimed };
}

/** Begin unstaking from a pool (starts unpooling period). */
export async function beginUnstake(
  poolContract: string
): Promise<StakedPosition> {
  await delay(1200);

  const pos = MOCK_POSITIONS.find((p) => p.poolContract === poolContract);
  if (!pos) throw new Error("Position not found");

  pos.unpooling = true;
  return { ...pos };
}

/** Finalize unstaking (after unpooling period). */
export async function finalizeUnstake(
  poolContract: string
): Promise<{ unstaked: string }> {
  await delay(1000);

  const idx = MOCK_POSITIONS.findIndex((p) => p.poolContract === poolContract);
  if (idx === -1) throw new Error("Position not found");

  const pos = MOCK_POSITIONS[idx];
  if (!pos.unpooling) throw new Error("Not in unpooling period");

  const unstaked = pos.staked;
  const rewards = pos.rewards;
  MOCK_POSITIONS.splice(idx, 1);
  return { unstaked, ...(rewards && parseFloat(rewards) > 0 ? { claimed: rewards } : {}) } as { unstaked: string; claimed?: string };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
