// __tests__/lib/groups.test.ts
import { calcNetBalances, type Expense, type Settlement } from "@/lib/groups";

const SELF = "user-A";

function makeExpense(
  overrides: Partial<Expense> & Pick<Expense, "paidBy" | "amount" | "splits">
): Expense {
  return {
    id: Math.random().toString(36),
    groupId: "group-1",
    token: "STRK",
    description: "Test",
    settledBy: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeSettlement(
  overrides: Partial<Settlement> &
    Pick<Settlement, "fromUserId" | "toUserId" | "amount">
): Settlement {
  return {
    id: Math.random().toString(36),
    groupId: "group-1",
    token: "STRK",
    txHash: null,
    isPrivate: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("calcNetBalances", () => {
  it("two-person equal split: B owes A half", () => {
    const expenses = [
      makeExpense({
        paidBy: SELF,
        amount: "20",
        splits: [
          { userId: SELF, amount: "10" },
          { userId: "user-B", amount: "10" },
        ],
      }),
    ];

    const result = calcNetBalances(expenses, [], SELF);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fromUserId: "user-B",
      toUserId: SELF,
      amount: 10,
      token: "STRK",
    });
  });

  it("three-person equal split: B and C each owe A", () => {
    const expenses = [
      makeExpense({
        paidBy: SELF,
        amount: "30",
        splits: [
          { userId: SELF, amount: "10" },
          { userId: "user-B", amount: "10" },
          { userId: "user-C", amount: "10" },
        ],
      }),
    ];

    const result = calcNetBalances(expenses, [], SELF);
    expect(result).toHaveLength(2);

    const bOwes = result.find((b) => b.fromUserId === "user-B");
    const cOwes = result.find((b) => b.fromUserId === "user-C");
    expect(bOwes?.amount).toBe(10);
    expect(cOwes?.amount).toBe(10);
  });

  it("settlements reduce balances", () => {
    const expenses = [
      makeExpense({
        paidBy: SELF,
        amount: "20",
        splits: [
          { userId: SELF, amount: "10" },
          { userId: "user-B", amount: "10" },
        ],
      }),
    ];
    const settlements = [
      makeSettlement({ fromUserId: "user-B", toUserId: SELF, amount: "10" }),
    ];

    const result = calcNetBalances(expenses, settlements, SELF);
    // B settled the full $10 — no outstanding balance
    expect(result).toHaveLength(0);
  });

  it("multiple expenses: net balances computed correctly", () => {
    const expenses = [
      makeExpense({
        paidBy: SELF,
        amount: "20",
        splits: [
          { userId: SELF, amount: "10" },
          { userId: "user-B", amount: "10" },
        ],
      }),
      makeExpense({
        paidBy: "user-B",
        amount: "30",
        splits: [
          { userId: SELF, amount: "15" },
          { userId: "user-B", amount: "15" },
        ],
      }),
    ];

    const result = calcNetBalances(expenses, [], SELF);
    // A is owed 10, but owes B 15 -> net: A owes B 5
    expect(result).toHaveLength(1);
    expect(result[0].fromUserId).toBe(SELF);
    expect(result[0].toUserId).toBe("user-B");
    expect(result[0].amount).toBe(5);
  });

  it("filters to only balances involving selfId", () => {
    const expenses = [
      makeExpense({
        paidBy: "user-B",
        amount: "20",
        splits: [
          { userId: "user-B", amount: "10" },
          { userId: "user-C", amount: "10" },
        ],
      }),
    ];

    // SELF is not involved in this expense at all
    const result = calcNetBalances(expenses, [], SELF);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty expenses", () => {
    const result = calcNetBalances([], [], SELF);
    expect(result).toEqual([]);
  });

  it("returns empty array when all debts fully settled", () => {
    const expenses = [
      makeExpense({
        paidBy: SELF,
        amount: "10",
        splits: [
          { userId: SELF, amount: "5" },
          { userId: "user-B", amount: "5" },
        ],
      }),
    ];
    const settlements = [
      makeSettlement({ fromUserId: "user-B", toUserId: SELF, amount: "5" }),
    ];

    const result = calcNetBalances(expenses, settlements, SELF);
    expect(result).toHaveLength(0);
  });

  it("handles rounding for 3-way split", () => {
    const expenses = [
      makeExpense({
        paidBy: SELF,
        amount: "10",
        splits: [
          { userId: SELF, amount: "3.33" },
          { userId: "user-B", amount: "3.33" },
          { userId: "user-C", amount: "3.34" },
        ],
      }),
    ];

    const result = calcNetBalances(expenses, [], SELF);
    // B owes ~3.33, C owes ~3.34 — both should appear
    expect(result).toHaveLength(2);
    const total = result.reduce((sum, b) => sum + b.amount, 0);
    expect(total).toBeCloseTo(6.67, 1);
  });
});
