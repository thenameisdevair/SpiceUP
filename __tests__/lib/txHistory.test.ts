// __tests__/lib/txHistory.test.ts
import { getTxHistory, saveTx, clearHistory, type TxRecord } from "@/lib/txHistory";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Clear mock storage between tests to prevent data leaking
beforeEach(async () => {
  await AsyncStorage.clear();
});

function makeTx(overrides?: Partial<TxRecord>): TxRecord {
  return {
    id: Math.random().toString(36),
    type: "send",
    amount: "1.0",
    token: "STRK",
    counterparty: "0xabc",
    timestamp: Date.now(),
    txHash: "0xhash" + Math.random().toString(36),
    isPrivate: false,
    ...overrides,
  };
}

describe("getTxHistory", () => {
  it("returns empty array when no history exists", async () => {
    const result = await getTxHistory();
    expect(result).toEqual([]);
  });
});

describe("saveTx", () => {
  it("saves a record and retrieves it", async () => {
    const tx = makeTx({ type: "send", amount: "5.0" });
    await saveTx(tx);

    const history = await getTxHistory();
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe("5.0");
    expect(history[0].type).toBe("send");
  });

  it("maintains newest-first ordering", async () => {
    const tx1 = makeTx({ amount: "1.0", timestamp: 1000 });
    const tx2 = makeTx({ amount: "2.0", timestamp: 2000 });

    await saveTx(tx1);
    await saveTx(tx2);

    const history = await getTxHistory();
    expect(history).toHaveLength(2);
    expect(history[0].amount).toBe("2.0"); // newest first
    expect(history[1].amount).toBe("1.0");
  });

  it("caps history at 200 records", async () => {
    for (let i = 0; i < 201; i++) {
      await saveTx(makeTx({ amount: `${i}` }));
    }

    const history = await getTxHistory();
    expect(history).toHaveLength(200);
    // The oldest record (amount "0") should be dropped
    expect(history[199].amount).toBe("1");
  });
});

describe("clearHistory", () => {
  it("removes all records", async () => {
    await saveTx(makeTx());
    await saveTx(makeTx());
    expect((await getTxHistory()).length).toBeGreaterThan(0);

    await clearHistory();
    expect(await getTxHistory()).toEqual([]);
  });
});

describe("TxRecord types", () => {
  it("accepts all earn-specific type values", async () => {
    const types: TxRecord["type"][] = [
      "send", "receive", "fund", "withdraw", "rollover",
      "stake", "unstake_intent", "unstake", "claim_rewards",
      "dca_create", "dca_cancel", "lend_deposit", "lend_withdraw",
    ];

    for (const type of types) {
      const tx = makeTx({ type });
      await saveTx(tx);
    }

    const history = await getTxHistory();
    expect(history.length).toBe(types.length);
  });
});
