import { getSdk } from "@/lib/starkzap";
import type { OnboardResult, Pool } from "starkzap";
import type { Address, Token } from "starkzap";
import type { StakerPool, StakedPosition } from "@/lib/earn";
import { getCuratedValidators } from "@/constants/validators";

// ── Pool discovery ────────────────────────────────────────────────────────────

/**
 * Fetch all pools across the curated validator list.
 * Uses Promise.allSettled so a single failing validator does not block the rest.
 */
export async function getValidatorPools(): Promise<StakerPool[]> {
  const sdk = getSdk();
  const results = await Promise.allSettled(
    getCuratedValidators().map(async (v) => {
      const pools = await sdk.getStakerPools(v.stakerAddress);
      return pools.map(
        (p: Pool): StakerPool => ({
          poolContract: p.poolContract,
          token: p.token,
          totalDelegated: p.amount,
          validatorName: v.name,
          validatorLogoUrl: v.logoUrl ?? null,
          apyPercent: null,        // wired in Cat 7
          commissionPercent: null, // loaded per-pool when user taps stake
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

// ── Transactions ──────────────────────────────────────────────────────────────

/** Stake STRK into a pool. */
export async function stakeInPool(
  onboard: OnboardResult,
  poolAddress: Address,
  amountStr: string,
  token: Token
) {
  const amount = (require("starkzap") as typeof import("starkzap")).Amount.parse(amountStr, token);
  return onboard.wallet.tx().stake(poolAddress, amount).send();
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
  const amount = (require("starkzap") as typeof import("starkzap")).Amount.parse(amountStr, token);
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
