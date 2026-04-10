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
      symbol: address.slice(0, 8) + "\u2026",
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
    : "\u2014";
  const sold   = o.amountSoldBase   ? Amount.fromRaw(o.amountSoldBase,   sellToken).toUnit().toString() : "0";
  const bought = o.amountBoughtBase ? Amount.fromRaw(o.amountBoughtBase, buyToken).toUnit().toString()  : "0";

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
    frequency: string;  // ISO 8601: "P1D", "P1W", "PT12H"
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
