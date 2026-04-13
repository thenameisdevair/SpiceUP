/**
 * Mock DCA (Dollar Cost Averaging) Module
 * Simulates DCA order creation and management
 */

import type { AppDcaOrder, DcaFrequency } from "@/lib/earn";

/** Available DCA frequency options */
export const DCA_FREQUENCY_OPTIONS: DcaFrequency[] = [
  "Every 12h",
  "Daily",
  "Weekly",
];

/** Mock DCA orders */
let MOCK_ORDERS: AppDcaOrder[] = [
  {
    id: "dca_001",
    sellToken: "STRK",
    buyToken: "ETH",
    sellAmount: "500",
    perCycleAmount: "35.714",
    frequency: "Weekly",
    status: "ACTIVE",
    executedTrades: 3,
    createdAt: Date.now() - 21 * 86400000,
  },
  {
    id: "dca_002",
    sellToken: "USDC",
    buyToken: "STRK",
    sellAmount: "200",
    perCycleAmount: "8.333",
    frequency: "Daily",
    status: "INDEXING",
    executedTrades: 0,
    createdAt: Date.now() - 2 * 86400000,
  },
];

/** Get all active DCA orders */
export async function getActiveDcaOrders(): Promise<AppDcaOrder[]> {
  await delay(700);
  return [...MOCK_ORDERS];
}

/** Create a new DCA order */
export async function createDcaOrder(params: {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  frequency: DcaFrequency;
}): Promise<AppDcaOrder> {
  await delay(1500);

  const frequencyCycles: Record<DcaFrequency, number> = {
    "Every 12h": 2, // 2 per day
    Daily: 1,
    Weekly: 0.1429,
  };

  const order: AppDcaOrder = {
    id: `dca_${Date.now().toString(36)}`,
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    perCycleAmount: (
      parseFloat(params.sellAmount) * frequencyCycles[params.frequency]
    ).toFixed(4),
    frequency: params.frequency,
    status: "INDEXING",
    executedTrades: 0,
    createdAt: Date.now(),
  };

  MOCK_ORDERS.push(order);
  return { ...order };
}

/** Cancel an existing DCA order */
export async function cancelDcaOrder(
  orderId: string
): Promise<{ cancelled: boolean }> {
  await delay(1000);

  const idx = MOCK_ORDERS.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new Error("Order not found");

  MOCK_ORDERS[idx].status = "CANCELLED";
  // Remove from active orders
  MOCK_ORDERS = MOCK_ORDERS.filter((o) => o.status !== "CANCELLED");
  return { cancelled: true };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
