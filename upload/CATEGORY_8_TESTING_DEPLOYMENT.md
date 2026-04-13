# Category 8 — Testing & Deployment (Detailed Plan)

> **Goal**: Verified working on Sepolia testnet, then shipped to mainnet with grants applied.

---

## Context

- Categories 1–7 complete: 82 TypeScript/TSX files across `app/`, `lib/`, `hooks/`, `stores/`, `components/`, `constants/`.
- **No existing test infrastructure** — no Jest, no testing-library, no `__tests__/` directory, no `.github/workflows/`, no `eas.json`.
- Existing npm scripts: `start`, `android`, `ios`, `web`, `typecheck` (`tsc --noEmit`), `lint` (`expo lint`), `doctor` (`expo-doctor`).
- Environment: `.env` with 6 `EXPO_PUBLIC_*` vars. Network switching via `constants/network.ts` reading `ENV.NETWORK` from `lib/env.ts`.
- `app.json` has bundle IDs `com.spiceup.app` for both iOS and Android, URL scheme `spiceup`, dark `userInterfaceStyle`.
- Pure-function modules well suited for unit testing: `lib/tongo.ts` (QR parsing, key gen), `lib/groups.ts` (`calcNetBalances`), `lib/format.ts`, `lib/txHistory.ts`, `lib/dca.ts`.
- 5 Zustand stores (`stores/auth.ts`, `wallet.ts`, `earn.ts`, `groups.ts`, `toast.ts`) — all testable without React rendering via `getState()`.
- SDK-dependent modules (`lib/staking.ts`, `lib/lending.ts`, `lib/dca.ts` CRUD functions) require SDK mocks.
- All network-dependent logic flows through `constants/network.ts` — no hardcoded addresses in any logic file.

---

## 8.1 Unit Tests

> PRD 8.1: Test `lib/tongo.ts` functions with mocked provider. Test `lib/starkzap.ts` initialization. Test Zustand store actions. Test amount parsing/formatting utilities.

### 8.1.1 Install Test Dependencies

```bash
npm install -D jest jest-expo @testing-library/react-native @testing-library/jest-native @types/jest
```

Rationale: `jest-expo` is Expo's official Jest preset — it handles module resolution for expo-modules, NativeWind, and React Native. TypeScript is transpiled via Babel (same pipeline as Metro), so `ts-jest` is not needed.

### 8.1.2 `jest.config.js` (NEW)

```javascript
// jest.config.js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|starkzap|starkzap-native|@privy-io|@supabase|@fatsolutions)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterSetup: ["<rootDir>/__mocks__/setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
```

Key decisions:
- `transformIgnorePatterns` allows Babel to transpile all project-specific packages that ship untranspiled ESM (`starkzap`, `starkzap-native`, `@privy-io/expo`, `@supabase/supabase-js`, `nativewind`, all expo-* modules).
- `moduleNameMapper` mirrors the `@/*` path aliases from `tsconfig.json`.
- `setupFilesAfterSetup` loads global mocks for native modules that don't exist in the Node.js test environment.

### 8.1.3 `__mocks__/setup.ts` (NEW)

Global test setup — mocks every native module that exists only on-device.

```typescript
// __mocks__/setup.ts

// ── expo-secure-store ────────────────────────────────────────────────────────
const secureStoreData = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(secureStoreData.get(key) ?? null)
  ),
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStoreData.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    secureStoreData.delete(key);
    return Promise.resolve();
  }),
}));

// ── expo-crypto ──────────────────────────────────────────────────────────────
// Deterministic for reproducible tests — each call returns the same 32 bytes.
jest.mock("expo-crypto", () => ({
  getRandomBytes: jest.fn((count: number) => {
    const arr = new Uint8Array(count);
    for (let i = 0; i < count; i++) arr[i] = (i * 7 + 13) % 256;
    return arr;
  }),
}));

// ── @react-native-async-storage/async-storage ────────────────────────────────
const asyncStoreData = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) =>
      Promise.resolve(asyncStoreData.get(key) ?? null)
    ),
    setItem: jest.fn((key: string, value: string) => {
      asyncStoreData.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      asyncStoreData.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      asyncStoreData.clear();
      return Promise.resolve();
    }),
  },
}));

// ── expo-sqlite ──────────────────────────────────────────────────────────────
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
  })),
}));

// ── Environment variables ────────────────────────────────────────────────────
// lib/env.ts throws if PRIVY_APP_ID is missing — set a dummy for tests.
process.env.EXPO_PUBLIC_NETWORK = "sepolia";
process.env.EXPO_PUBLIC_PRIVY_APP_ID = "test_privy_app_id";
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test_supabase_key";

// ── Silence noisy warnings ──────────────────────────────────────────────────
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress React Native-specific warnings in test output
  if (typeof args[0] === "string" && args[0].includes("Animated")) return;
  origWarn(...args);
};

// ── Clear stores between tests ───────────────────────────────────────────────
beforeEach(() => {
  secureStoreData.clear();
  asyncStoreData.clear();
});
```

### 8.1.4 `__mocks__/starkzap.ts` (NEW)

Mocks the `starkzap` package exports used across all lib/ modules.

```typescript
// __mocks__/starkzap.ts

export class Amount {
  private raw: bigint;
  private token: any;

  constructor(raw: bigint, token: any) {
    this.raw = raw;
    this.token = token;
  }

  static parse(str: string, token: any): Amount {
    const float = parseFloat(str);
    const base = BigInt(Math.round(float * 10 ** token.decimals));
    return new Amount(base, token);
  }

  static fromRaw(raw: bigint, token: any): Amount {
    return new Amount(raw, token);
  }

  toFormatted(_compressed?: boolean): string {
    const num = Number(this.raw) / 10 ** this.token.decimals;
    return num.toFixed(4);
  }

  toUnit(): number {
    return Number(this.raw) / 10 ** this.token.decimals;
  }

  toBase(): bigint {
    return this.raw;
  }
}

export class TongoConfidential {
  recipientId: { x: bigint; y: bigint };

  constructor(_opts: any) {
    this.recipientId = { x: 1n, y: 2n };
  }

  async getState() {
    return { balance: 0n, pending: 0n, nonce: 0n };
  }

  async ragequit(_opts: any) {
    return [];
  }

  async rollover() {
    return [];
  }
}

export class StarkZap {
  constructor(_opts: any) {}

  async onboard(opts: any) {
    return {
      wallet: {
        address: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        tx: () => ({
          confidentialFund: jest.fn().mockReturnValue({ send: jest.fn() }),
          confidentialTransfer: jest.fn().mockReturnValue({ send: jest.fn() }),
          confidentialWithdraw: jest.fn().mockReturnValue({ send: jest.fn() }),
          stake: jest.fn().mockReturnValue({ send: jest.fn() }),
          claimRewards: jest.fn().mockReturnValue({ send: jest.fn() }),
          exitPool: jest.fn().mockReturnValue({ send: jest.fn() }),
          dcaCreate: jest.fn().mockReturnValue({ send: jest.fn() }),
          dcaCancel: jest.fn().mockReturnValue({ send: jest.fn() }),
          lendDeposit: jest.fn().mockReturnValue({ send: jest.fn() }),
          lendWithdraw: jest.fn().mockReturnValue({ send: jest.fn() }),
        }),
        execute: jest.fn(),
        dca: () => ({
          getOrders: jest.fn().mockResolvedValue([]),
        }),
        getBalance: jest.fn().mockResolvedValue(new Amount(0n, { decimals: 18 })),
      },
    };
  }

  async getStakerPools() {
    return [];
  }
}

export class RpcProvider {
  constructor(_opts: any) {}
}

// Re-export type placeholders
export type Address = string;
export type Token = { name: string; address: string; decimals: number; symbol: string };
export type ConfidentialRecipient = { x: bigint; y: bigint };
export type ConfidentialState = { balance: bigint; pending: bigint; nonce: bigint };
export type OnboardResult = ReturnType<StarkZap["onboard"]> extends Promise<infer T> ? T : never;
export type OnboardPrivyResolveResult = { account: string; privateKey: string };
export type DcaOrder = {
  id: string;
  orderAddress: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmountPerCycleBase: bigint;
  amountSoldBase: bigint;
  amountBoughtBase: bigint;
  frequency: string;
  status: string;
  startDate: string;
  endDate: string;
  executedTradesCount: number;
};
export type LendingMarket = { address: string; token: any; apy: number };
```

### 8.1.5 `__mocks__/starkzap-native.ts` (NEW)

`starkzap-native` is the React Native build of the same API — re-export the mock.

```typescript
// __mocks__/starkzap-native.ts
export * from "./starkzap";
```

### 8.1.6 `__mocks__/supabase.ts` (NEW)

Mock for `lib/supabase.ts` — chainable query builder pattern.

```typescript
// __mocks__/supabase.ts

type MockReturn = { data: any; error: any };

const defaults: MockReturn = { data: null, error: null };
let nextReturn: MockReturn = { ...defaults };

function chainable(): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        // Terminal methods return the mock result
        if (prop === "single" || prop === "then") {
          const result = { ...nextReturn };
          nextReturn = { ...defaults };
          if (prop === "single") return () => Promise.resolve(result);
          return (resolve: any) => resolve(result);
        }
        // Everything else returns the chainable proxy
        return (..._args: any[]) => chainable();
      },
    }
  );
  return proxy;
}

export const supabase = {
  from: (_table: string) => chainable(),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
};

/** Call before a test to set what the next Supabase query returns. */
export function __setMockReturn(data: any, error: any = null) {
  nextReturn = { data, error };
}
```

To use this mock in tests, add at the top of the test file:

```typescript
jest.mock("@/lib/supabase", () => require("../__mocks__/supabase"));
```

### 8.1.7 `package.json` Script Additions

Add these scripts alongside the existing ones:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 8.1.8 Test Directory Structure

```
__mocks__/
├── setup.ts
├── starkzap.ts
├── starkzap-native.ts
└── supabase.ts
__tests__/
├── lib/
│   ├── tongo.test.ts
│   ├── groups.test.ts
│   ├── format.test.ts
│   ├── txHistory.test.ts
│   └── dca.test.ts
├── stores/
│   ├── auth.test.ts
│   ├── wallet.test.ts
│   ├── earn.test.ts
│   ├── groups.test.ts
│   └── toast.test.ts
└── constants/
    └── tokens.test.ts
```

---

### 8.1.9 `__tests__/lib/tongo.test.ts`

> Tests for `lib/tongo.ts` — key generation, QR parsing, address validation.

```typescript
// __tests__/lib/tongo.test.ts
import {
  generateTongoPrivateKey,
  getOrCreateTongoKey,
  parseTongoQr,
  isValidTongoAddress,
} from "@/lib/tongo";
import * as SecureStore from "expo-secure-store";

describe("generateTongoPrivateKey", () => {
  it("returns a 66-character hex string starting with 0x", async () => {
    const key = await generateTongoPrivateKey();
    expect(key).toMatch(/^0x[0-9a-f]{64}$/);
    expect(key.length).toBe(66);
  });

  it("is deterministic with mocked crypto (same bytes → same key)", async () => {
    const key1 = await generateTongoPrivateKey();
    const key2 = await generateTongoPrivateKey();
    // Our mock returns the same bytes every time
    expect(key1).toBe(key2);
  });
});

describe("getOrCreateTongoKey", () => {
  it("generates and stores a new key when none exists", async () => {
    const key = await getOrCreateTongoKey();
    expect(key).toMatch(/^0x[0-9a-f]{64}$/);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "spiceup.tongo.privateKey",
      key
    );
  });

  it("returns the stored key without generating when one exists", async () => {
    const existingKey = "0x" + "ab".repeat(32);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(existingKey);

    const key = await getOrCreateTongoKey();
    expect(key).toBe(existingKey);
    // setItemAsync should NOT be called — no new key generated
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

describe("parseTongoQr", () => {
  it('parses valid "tongo:x:y" format', () => {
    const result = parseTongoQr("tongo:123:456");
    expect(result).toEqual({ x: 123n, y: 456n });
  });

  it("parses large bigint values", () => {
    const result = parseTongoQr(
      "tongo:999999999999999999:888888888888888888"
    );
    expect(result).toEqual({
      x: 999999999999999999n,
      y: 888888888888888888n,
    });
  });

  it("returns null for invalid prefix", () => {
    expect(parseTongoQr("notongo:1:2")).toBeNull();
  });

  it("returns null for missing y coordinate", () => {
    expect(parseTongoQr("tongo:1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseTongoQr("")).toBeNull();
  });

  it("returns null for non-numeric coordinates", () => {
    expect(parseTongoQr("tongo:abc:def")).toBeNull();
  });

  it("returns null for tongo: with trailing colon only", () => {
    expect(parseTongoQr("tongo:")).toBeNull();
  });
});

describe("isValidTongoAddress", () => {
  it("returns true for valid tongo addresses", () => {
    expect(isValidTongoAddress("tongo:123:456")).toBe(true);
  });

  it("returns false for invalid formats", () => {
    expect(isValidTongoAddress("")).toBe(false);
    expect(isValidTongoAddress("0x1234")).toBe(false);
    expect(isValidTongoAddress("tongo:abc:def")).toBe(false);
    expect(isValidTongoAddress("tongo:1")).toBe(false);
  });
});
```

### 8.1.10 `__tests__/lib/groups.test.ts`

> Tests for `calcNetBalances` — the most complex pure function in the codebase. Only this function is unit-testable; the Supabase-dependent CRUD functions belong in integration tests (8.2).

```typescript
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
    // A is owed 10, but owes B 15 → net: A owes B 5
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
```

### 8.1.11 `__tests__/lib/format.test.ts`

> Tests for `lib/format.ts` — balance formatting, address shortening, fiat conversion.

```typescript
// __tests__/lib/format.test.ts
import { formatBalance, shortenAddress, toFiat, formatUsdValue } from "@/lib/format";
import { Amount } from "starkzap";

describe("formatBalance", () => {
  it("returns em-dash for null", () => {
    expect(formatBalance(null)).toBe("\u2014");
  });

  it("calls toFormatted(true) on the Amount", () => {
    const mockToken = { decimals: 18, name: "T", address: "0x0", symbol: "T" };
    const amount = Amount.parse("1.5", mockToken);
    const result = formatBalance(amount);
    expect(typeof result).toBe("string");
    expect(result).not.toBe("\u2014");
  });
});

describe("shortenAddress", () => {
  const addr = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("shortens long addresses with default chars=6", () => {
    const result = shortenAddress(addr);
    expect(result).toBe("0x012345...abcdef");
  });

  it("shortens with custom char count", () => {
    const result = shortenAddress(addr, 4);
    expect(result).toBe("0x0123...cdef");
  });

  it("returns short addresses unchanged", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });

  it("returns address unchanged when length equals threshold", () => {
    // chars=6 → threshold = 6*2 + 2 = 14
    const exact = "0x1234567890ab"; // 14 chars
    expect(shortenAddress(exact)).toBe(exact);
  });
});

describe("toFiat", () => {
  it('returns "$—" for any input (stub)', () => {
    expect(toFiat(null, "ETH")).toBe("$\u2014");
    const mockToken = { decimals: 18, name: "T", address: "0x0", symbol: "T" };
    expect(toFiat(Amount.parse("100", mockToken), "ETH")).toBe("$\u2014");
  });
});

describe("formatUsdValue", () => {
  it('returns "$—" for undefined', () => {
    expect(formatUsdValue(undefined)).toBe("$\u2014");
  });

  it('returns "$—" for 0n', () => {
    expect(formatUsdValue(0n)).toBe("$\u2014");
  });

  it("formats 1e18-scaled values correctly", () => {
    // 1.5 USD = 1_500_000_000_000_000_000n
    expect(formatUsdValue(1_500_000_000_000_000_000n)).toBe("$1.50");
  });

  it("formats large values", () => {
    // 1234.56 USD
    expect(formatUsdValue(1_234_560_000_000_000_000_000n)).toBe("$1234.56");
  });
});
```

### 8.1.12 `__tests__/lib/txHistory.test.ts`

> Tests for `lib/txHistory.ts` — transaction persistence in AsyncStorage.

```typescript
// __tests__/lib/txHistory.test.ts
import { getTxHistory, saveTx, clearHistory, type TxRecord } from "@/lib/txHistory";

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
```

### 8.1.13 `__tests__/lib/dca.test.ts`

> Tests for pure functions in `lib/dca.ts`.

```typescript
// __tests__/lib/dca.test.ts
import { frequencyToLabel, DCA_FREQUENCY_OPTIONS } from "@/lib/dca";

describe("DCA_FREQUENCY_OPTIONS", () => {
  it("has exactly 3 entries", () => {
    expect(DCA_FREQUENCY_OPTIONS).toHaveLength(3);
  });

  it("has correct label/value pairs", () => {
    expect(DCA_FREQUENCY_OPTIONS).toEqual([
      { label: "Every 12h", value: "PT12H" },
      { label: "Daily", value: "P1D" },
      { label: "Weekly", value: "P1W" },
    ]);
  });
});

describe("frequencyToLabel", () => {
  it('maps "PT12H" to "Every 12h"', () => {
    expect(frequencyToLabel("PT12H")).toBe("Every 12h");
  });

  it('maps "P1D" to "Daily"', () => {
    expect(frequencyToLabel("P1D")).toBe("Daily");
  });

  it('maps "P1W" to "Weekly"', () => {
    expect(frequencyToLabel("P1W")).toBe("Weekly");
  });

  it("returns the raw value for unknown frequencies", () => {
    expect(frequencyToLabel("P2W")).toBe("P2W");
    expect(frequencyToLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
```

### 8.1.14 `__tests__/stores/auth.test.ts`

> Tests for `stores/auth.ts` — Zustand store actions tested without React rendering.

```typescript
// __tests__/stores/auth.test.ts
import { useAuthStore } from "@/stores/auth";

// Reset store to initial state before each test
beforeEach(() => {
  useAuthStore.getState().reset();
});

describe("useAuthStore", () => {
  it('initializes with status "idle" and all fields null', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe("idle");
    expect(state.error).toBeNull();
    expect(state.privyUserId).toBeNull();
    expect(state.starknetAddress).toBeNull();
    expect(state.tongoRecipientId).toBeNull();
    expect(state.wallet).toBeNull();
    expect(state.tongo).toBeNull();
  });

  it("setStatus updates status and clears error by default", () => {
    useAuthStore.getState().setStatus("initializing");
    const state = useAuthStore.getState();
    expect(state.status).toBe("initializing");
    expect(state.error).toBeNull();
  });

  it("setStatus with error sets both fields", () => {
    useAuthStore.getState().setStatus("error", "something broke");
    const state = useAuthStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("something broke");
  });

  it("setIdentity sets all fields and transitions to ready", () => {
    const mockWallet = { address: "0xabc" } as any;
    const mockTongo = { recipientId: { x: 1n, y: 2n } } as any;

    useAuthStore.getState().setIdentity({
      privyUserId: "privy-123",
      starknetAddress: "0xabc",
      tongoRecipientId: { x: 1n, y: 2n },
      wallet: mockWallet,
      tongo: mockTongo,
    });

    const state = useAuthStore.getState();
    expect(state.status).toBe("ready");
    expect(state.error).toBeNull();
    expect(state.privyUserId).toBe("privy-123");
    expect(state.starknetAddress).toBe("0xabc");
    expect(state.wallet).toBe(mockWallet);
    expect(state.tongo).toBe(mockTongo);
  });

  it("reset returns to initial state", () => {
    useAuthStore.getState().setIdentity({
      privyUserId: "privy-123",
      starknetAddress: "0xabc",
      tongoRecipientId: { x: 1n, y: 2n },
      wallet: {} as any,
      tongo: {} as any,
    });

    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.status).toBe("idle");
    expect(state.privyUserId).toBeNull();
    expect(state.wallet).toBeNull();
    expect(state.tongo).toBeNull();
  });
});
```

### 8.1.15 `__tests__/stores/wallet.test.ts`

```typescript
// __tests__/stores/wallet.test.ts
import { useWalletStore } from "@/stores/wallet";

beforeEach(() => {
  useWalletStore.setState({
    balances: { ETH: null, STRK: null, USDC: null },
    confidential: null,
    confidentialAvailable: true,
    lastUpdated: null,
    loading: false,
    error: null,
  });
});

describe("useWalletStore", () => {
  it("initializes with all balances null", () => {
    const state = useWalletStore.getState();
    expect(state.balances.ETH).toBeNull();
    expect(state.balances.STRK).toBeNull();
    expect(state.balances.USDC).toBeNull();
    expect(state.confidential).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("setBalance updates one token without affecting others", () => {
    const mockAmount = { toFormatted: () => "1.5" } as any;
    useWalletStore.getState().setBalance("ETH", mockAmount);

    const state = useWalletStore.getState();
    expect(state.balances.ETH).toBe(mockAmount);
    expect(state.balances.STRK).toBeNull();
    expect(state.balances.USDC).toBeNull();
  });

  it("setBalance updates multiple tokens independently", () => {
    const ethAmount = { toFormatted: () => "1.0" } as any;
    const strkAmount = { toFormatted: () => "100.0" } as any;

    useWalletStore.getState().setBalance("ETH", ethAmount);
    useWalletStore.getState().setBalance("STRK", strkAmount);

    const state = useWalletStore.getState();
    expect(state.balances.ETH).toBe(ethAmount);
    expect(state.balances.STRK).toBe(strkAmount);
  });

  it("setConfidential sets the confidential state", () => {
    const mockState = { balance: 100n, pending: 0n, nonce: 1n } as any;
    useWalletStore.getState().setConfidential(mockState);
    expect(useWalletStore.getState().confidential).toBe(mockState);
  });

  it("setConfidentialUnavailable sets flag to false", () => {
    useWalletStore.getState().setConfidentialUnavailable();
    expect(useWalletStore.getState().confidentialAvailable).toBe(false);
  });

  it("setLoading toggles loading flag", () => {
    useWalletStore.getState().setLoading(true);
    expect(useWalletStore.getState().loading).toBe(true);
    useWalletStore.getState().setLoading(false);
    expect(useWalletStore.getState().loading).toBe(false);
  });

  it("setError sets and clears error", () => {
    useWalletStore.getState().setError("network failed");
    expect(useWalletStore.getState().error).toBe("network failed");
    useWalletStore.getState().setError(null);
    expect(useWalletStore.getState().error).toBeNull();
  });

  it("markUpdated sets lastUpdated to a recent timestamp", () => {
    const before = Date.now();
    useWalletStore.getState().markUpdated();
    const after = Date.now();
    const ts = useWalletStore.getState().lastUpdated!;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
```

### 8.1.16 `__tests__/stores/earn.test.ts`

```typescript
// __tests__/stores/earn.test.ts
import { useEarnStore } from "@/stores/earn";

beforeEach(() => {
  useEarnStore.setState({
    pools: [],
    stakedPositions: [],
    poolsLoading: false,
    poolsError: null,
    dcaOrders: [],
    dcaLoading: false,
    dcaError: null,
    lendingPositions: [],
    lendingMarkets: [],
    lendingLoading: false,
    lendingError: null,
    lastUpdated: null,
  });
});

describe("useEarnStore", () => {
  it("initializes with empty arrays and no errors", () => {
    const state = useEarnStore.getState();
    expect(state.pools).toEqual([]);
    expect(state.stakedPositions).toEqual([]);
    expect(state.dcaOrders).toEqual([]);
    expect(state.lendingPositions).toEqual([]);
    expect(state.lendingMarkets).toEqual([]);
    expect(state.poolsLoading).toBe(false);
    expect(state.dcaLoading).toBe(false);
    expect(state.lendingLoading).toBe(false);
  });

  // -- Staking --
  it("setPools sets the pools array", () => {
    const mockPool = { address: "0x1", apy: 5.5 } as any;
    useEarnStore.getState().setPools([mockPool]);
    expect(useEarnStore.getState().pools).toEqual([mockPool]);
  });

  it("setStakedPositions sets positions", () => {
    const mockPos = { poolAddress: "0x1", staked: 100 } as any;
    useEarnStore.getState().setStakedPositions([mockPos]);
    expect(useEarnStore.getState().stakedPositions).toEqual([mockPos]);
  });

  it("setPoolsLoading / setPoolsError work correctly", () => {
    useEarnStore.getState().setPoolsLoading(true);
    expect(useEarnStore.getState().poolsLoading).toBe(true);

    useEarnStore.getState().setPoolsError("timeout");
    expect(useEarnStore.getState().poolsError).toBe("timeout");
  });

  // -- DCA --
  it("setDcaOrders sets the DCA orders array", () => {
    const mockOrder = { id: "o1", frequency: "P1D" } as any;
    useEarnStore.getState().setDcaOrders([mockOrder]);
    expect(useEarnStore.getState().dcaOrders).toEqual([mockOrder]);
  });

  it("setDcaLoading / setDcaError work correctly", () => {
    useEarnStore.getState().setDcaLoading(true);
    expect(useEarnStore.getState().dcaLoading).toBe(true);

    useEarnStore.getState().setDcaError("no provider");
    expect(useEarnStore.getState().dcaError).toBe("no provider");
  });

  // -- Lending --
  it("setLendingPositions / setLendingMarkets work correctly", () => {
    const mockPos = { token: "ETH", deposited: 1.5 } as any;
    const mockMarket = { address: "0x1", apy: 3.2 } as any;

    useEarnStore.getState().setLendingPositions([mockPos]);
    useEarnStore.getState().setLendingMarkets([mockMarket]);

    expect(useEarnStore.getState().lendingPositions).toEqual([mockPos]);
    expect(useEarnStore.getState().lendingMarkets).toEqual([mockMarket]);
  });

  it("setLendingLoading / setLendingError work correctly", () => {
    useEarnStore.getState().setLendingLoading(true);
    expect(useEarnStore.getState().lendingLoading).toBe(true);

    useEarnStore.getState().setLendingError("Vesu down");
    expect(useEarnStore.getState().lendingError).toBe("Vesu down");
  });

  // -- Metadata --
  it("markUpdated sets lastUpdated to a recent timestamp", () => {
    const before = Date.now();
    useEarnStore.getState().markUpdated();
    const ts = useEarnStore.getState().lastUpdated!;
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});
```

### 8.1.17 `__tests__/stores/groups.test.ts`

```typescript
// __tests__/stores/groups.test.ts
import { useGroupsStore } from "@/stores/groups";
import type { Group } from "@/lib/groups";

function makeGroup(id: string, name: string): Group {
  return {
    id,
    name,
    members: [],
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  useGroupsStore.setState({ groups: [], loading: false, error: null });
});

describe("useGroupsStore", () => {
  it("initializes with empty groups, loading false, error null", () => {
    const state = useGroupsStore.getState();
    expect(state.groups).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setGroups replaces the groups array", () => {
    const g1 = makeGroup("1", "Dinner");
    const g2 = makeGroup("2", "Travel");
    useGroupsStore.getState().setGroups([g1, g2]);
    expect(useGroupsStore.getState().groups).toEqual([g1, g2]);
  });

  it("addGroup prepends to existing groups (newest-first)", () => {
    const g1 = makeGroup("1", "Old Group");
    useGroupsStore.getState().setGroups([g1]);

    const g2 = makeGroup("2", "New Group");
    useGroupsStore.getState().addGroup(g2);

    const groups = useGroupsStore.getState().groups;
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("2"); // new group first
    expect(groups[1].id).toBe("1");
  });

  it("setLoading / setError work correctly", () => {
    useGroupsStore.getState().setLoading(true);
    expect(useGroupsStore.getState().loading).toBe(true);

    useGroupsStore.getState().setError("offline");
    expect(useGroupsStore.getState().error).toBe("offline");
  });
});
```

### 8.1.18 `__tests__/stores/toast.test.ts`

```typescript
// __tests__/stores/toast.test.ts
import { useToastStore } from "@/stores/toast";

beforeEach(() => {
  useToastStore.setState({ message: "", variant: "info", visible: false });
});

describe("useToastStore", () => {
  it('initializes with visible false, empty message, variant "info"', () => {
    const state = useToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe("");
    expect(state.variant).toBe("info");
  });

  it('show() sets message, visible true, defaults variant to "info"', () => {
    useToastStore.getState().show("Hello");
    const state = useToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe("Hello");
    expect(state.variant).toBe("info");
  });

  it('show() with "error" variant sets variant correctly', () => {
    useToastStore.getState().show("Error!", "error");
    expect(useToastStore.getState().variant).toBe("error");
  });

  it('show() with "success" variant sets variant correctly', () => {
    useToastStore.getState().show("Done", "success");
    expect(useToastStore.getState().variant).toBe("success");
  });

  it("hide() sets visible false, message unchanged", () => {
    useToastStore.getState().show("Visible");
    useToastStore.getState().hide();

    const state = useToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe("Visible"); // message preserved
  });
});
```

### 8.1.19 `__tests__/constants/tokens.test.ts`

```typescript
// __tests__/constants/tokens.test.ts
import {
  STRK,
  ETH,
  USDC,
  ALL_TOKENS,
  TOKEN_BY_SYMBOL,
  TOKEN_BY_ADDRESS,
} from "@/constants/tokens";
import { NETWORK } from "@/constants/network";

describe("Token definitions", () => {
  it("STRK has correct fields", () => {
    expect(STRK.symbol).toBe("STRK");
    expect(STRK.decimals).toBe(18);
    expect(STRK.name).toBe("Starknet Token");
    expect(STRK.address).toBe(NETWORK.tokens.STRK);
  });

  it("ETH has correct fields", () => {
    expect(ETH.symbol).toBe("ETH");
    expect(ETH.decimals).toBe(18);
    expect(ETH.name).toBe("Ether");
    expect(ETH.address).toBe(NETWORK.tokens.ETH);
  });

  it("USDC has correct fields", () => {
    expect(USDC.symbol).toBe("USDC");
    expect(USDC.decimals).toBe(6);
    expect(USDC.name).toBe("USD Coin");
    expect(USDC.address).toBe(NETWORK.tokens.USDC);
  });
});

describe("ALL_TOKENS", () => {
  it("has exactly 3 entries in order [ETH, STRK, USDC]", () => {
    expect(ALL_TOKENS).toHaveLength(3);
    expect(ALL_TOKENS[0].symbol).toBe("ETH");
    expect(ALL_TOKENS[1].symbol).toBe("STRK");
    expect(ALL_TOKENS[2].symbol).toBe("USDC");
  });
});

describe("TOKEN_BY_SYMBOL", () => {
  it("looks up STRK by symbol", () => {
    expect(TOKEN_BY_SYMBOL["STRK"]).toBe(STRK);
  });

  it("looks up ETH by symbol", () => {
    expect(TOKEN_BY_SYMBOL["ETH"]).toBe(ETH);
  });

  it("returns undefined for nonexistent symbol", () => {
    expect(TOKEN_BY_SYMBOL["NONEXISTENT"]).toBeUndefined();
  });
});

describe("TOKEN_BY_ADDRESS", () => {
  it("looks up STRK by lowercase address", () => {
    expect(TOKEN_BY_ADDRESS[STRK.address.toLowerCase()]).toBe(STRK);
  });

  it("all keys are lowercase", () => {
    for (const key of Object.keys(TOKEN_BY_ADDRESS)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
```

---

## 8.2 Integration Tests (Sepolia Testnet)

> PRD 8.2: Full send flow: fund -> confidential transfer -> verify recipient balance. Group settle flow: create group -> add expense -> settle. Stake flow: stake -> wait -> claim rewards.

### 8.2.1 Framework: Maestro

**Why Maestro over Detox**: Detox requires native builds and is tightly coupled to specific React Native versions, making it fragile with Expo managed workflow. Maestro is platform-independent, uses YAML-based flow definitions, requires no app code changes, and works with both Expo Go and EAS development builds.

Install Maestro:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### 8.2.2 Flow Directory Structure

```
e2e/
├── config.yaml
└── flows/
    ├── auth/
    │   └── login.yaml
    ├── send/
    │   ├── public-send.yaml
    │   ├── private-fund.yaml
    │   ├── private-send.yaml
    │   └── private-withdraw.yaml
    ├── groups/
    │   ├── create-group.yaml
    │   ├── add-expense.yaml
    │   └── settle-up.yaml
    └── earn/
        ├── stake.yaml
        ├── claim-rewards.yaml
        ├── unstake.yaml
        ├── create-dca.yaml
        └── lend-deposit.yaml
```

### 8.2.3 `e2e/config.yaml`

```yaml
# e2e/config.yaml
appId: com.spiceup.app
name: SpiceUP E2E
```

### 8.2.4 Key Flows

**`e2e/flows/auth/login.yaml`** — Login via email OTP

```yaml
appId: com.spiceup.app
---
- launchApp
- tapOn: "Continue with Email"
- inputText: "testuser@spiceup.dev"
- tapOn: "Send Code"
# OTP must be pre-configured as static "000000" for test accounts in Privy dashboard
- inputText: "000000"
- tapOn: "Verify"
# Wait for wallet init + Tongo key gen
- waitForAnimationToEnd
- assertVisible: "Home"
```

**`e2e/flows/send/private-fund.yaml`** — Fund confidential balance

```yaml
appId: com.spiceup.app
---
- launchApp
- assertVisible: "Home"
- tapOn: "Fund"
- tapOn: "STRK"
- inputText: "0.01"
- tapOn: "Review"
- assertVisible: "amount will be hidden"
- tapOn: "Confirm"
- waitForAnimationToEnd:
    timeout: 30000
- assertVisible: "Done"
```

**`e2e/flows/send/private-send.yaml`** — Send private transfer

```yaml
appId: com.spiceup.app
---
- launchApp
- tapOn: "Send"
- tapOn: "Private"
- inputText: "tongo:12345678901234:98765432109876"
- tapOn: "Next"
- inputText: "0.005"
- tapOn: "Review"
- assertVisible: "Generating"
- waitForAnimationToEnd:
    timeout: 60000
- assertVisible: "Done"
```

**`e2e/flows/groups/create-group.yaml`** — Create a group

```yaml
appId: com.spiceup.app
---
- launchApp
- tapOn: "Groups"
- tapOn: "New Group"
- inputText: "Test Dinner Group"
- tapOn: "Create"
- waitForAnimationToEnd
- assertVisible: "Test Dinner Group"
```

**`e2e/flows/groups/add-expense.yaml`** — Add an expense

```yaml
appId: com.spiceup.app
---
- launchApp
- tapOn: "Groups"
- tapOn: "Test Dinner Group"
- tapOn: "Add Expense"
- inputText: "Pizza night"
- tapOn: "Amount"
- inputText: "10"
- tapOn: "Equal Split"
- tapOn: "Save"
- waitForAnimationToEnd
- assertVisible: "Pizza night"
- assertVisible: "10"
```

**`e2e/flows/earn/stake.yaml`** — Stake STRK

```yaml
appId: com.spiceup.app
---
- launchApp
- tapOn: "Earn"
- tapOn: "Staking"
# Select first available pool
- tapOn: "Stake"
- inputText: "0.01"
- tapOn: "Confirm"
- waitForAnimationToEnd:
    timeout: 30000
- assertVisible: "Done"
```

### 8.2.5 Running Maestro Flows

```bash
# Run a single flow
maestro test e2e/flows/auth/login.yaml

# Run all flows
maestro test e2e/flows/

# Record a flow interactively (generates YAML from UI interactions)
maestro record
```

### 8.2.6 Sepolia Faucet — Pre-Fund Test Wallet

Before running integration tests, the test wallet needs Sepolia tokens:

| Token | Faucet URL | Amount |
|---|---|---|
| STRK | `https://starknet-faucet.vercel.app/` | At least 1 STRK |
| ETH | `https://blastapi.io/faucets/starknet-sepolia-eth` | At least 0.01 ETH |
| USDC | N/A — `constants/network.ts` has `USDC: "0x0"` on Sepolia | Unavailable until address filled |

Steps:
1. Login to the app on Sepolia and note the Starknet address from Settings screen.
2. Paste the address into the faucet URLs above.
3. Wait for the faucet transaction to confirm (~10s on Sepolia).
4. Verify balance appears on the Home screen.

### 8.2.7 Manual Test Checklist

Flows that require real devices, real transactions, or timing that cannot be automated:

```markdown
## Manual Test Checklist — Sepolia

### Auth (Category 2)
- [ ] Google OAuth login → wallet created → redirect to home
- [ ] Email OTP login → wallet created → redirect to home
- [ ] Phone number entry → SMS OTP → profile registered in Supabase
- [ ] Second login → existing Tongo key loaded from SecureStore (not regenerated)
- [ ] Logout → redirect to login screen → state cleared

### Public Wallet (Category 3)
- [ ] Public balances (ETH, STRK) visible on BalanceCard after login
- [ ] Balance polls every 15s (observe change after faucet funding)
- [ ] Receive screen shows QR for public address
- [ ] Receive screen shows QR for private (Tongo) address when toggled
- [ ] Copy address button copies to clipboard

### Confidential Payments (Category 4)
- [ ] Fund: move 0.01 STRK from public → confidential
- [ ] Verify confidential balance increases on home screen
- [ ] Send Private: transfer 0.005 STRK to second test account
- [ ] Verify "Generating ZK proof..." loading state appears
- [ ] Verify recipient receives funds (check second device/account)
- [ ] Withdraw: move confidential balance back to public
- [ ] Ragequit: emergency withdraw all (test with tiny balance)
- [ ] Pending rollover: if pending > 0, rollover button works

### Groups (Category 5)
- [ ] Create group with 2 members
- [ ] Add expense $10 equal split
- [ ] Net balances computed correctly
- [ ] Settle via private transfer → expense marked settled
- [ ] Group syncs across devices via Supabase realtime
- [ ] Offline: cached groups show from SQLite when offline

### Earn (Category 6)
- [ ] Staking pools load from curated validators
- [ ] Stake 0.01 STRK in a Sepolia pool → position appears
- [ ] Claim rewards (may be 0 on Sepolia)
- [ ] Begin unstake → unstake intent recorded
- [ ] Finalize unstake after unbond period
- [ ] DCA: create order (may fail on Sepolia if DCA provider unavailable)
- [ ] Lending: deposit to Vesu (may fail on Sepolia if Vesu unavailable)

### UI/UX (Category 7)
- [ ] Inter font loads (no flash of system font)
- [ ] Skeleton loaders visible during data fetch
- [ ] Tab bar: Home, Send, Groups, Earn, Settings — all navigable
- [ ] Dark theme consistent across all screens
- [ ] Toast notifications appear and auto-dismiss
- [ ] QR scanner opens camera and reads addresses
- [ ] Privacy badge shows on confidential transactions
```

---

## 8.3 Network Configuration

> PRD 8.3: Sepolia (default): `alpha-sepolia.starknet.io` RPC, Sepolia token addresses, Sepolia Tongo contract. Mainnet (ready): `alpha-mainnet.starknet.io` RPC, Mainnet addresses pre-configured — activate via `EXPO_PUBLIC_NETWORK=mainnet`. All constants in `constants/tokens.ts` keyed by network — no hardcoded addresses in logic.

### 8.3.1 How Network Switching Works

The entire network switch is a single env var, traced through 4 files:

1. **`lib/env.ts:8`** — `ENV.NETWORK` reads `process.env.EXPO_PUBLIC_NETWORK`, defaults to `"sepolia"`
2. **`constants/network.ts:39`** — `NETWORK` selects the `SEPOLIA` or `MAINNET` config object based on `ENV.NETWORK`
3. **`constants/tokens.ts:6,12,18`** — `STRK`, `ETH`, `USDC` derive addresses from `NETWORK.tokens.*`
4. **`lib/starkzap.ts:9`** — `provider` uses `NETWORK.rpcUrl`, `getSdk()` uses `NETWORK.name`
5. **`lib/tongo.ts:25`** — `initTongo()` uses `NETWORK.tongoContract`
6. **`constants/validators.ts`** — `CURATED_VALIDATORS` selects Sepolia or Mainnet validator list

No hardcoded addresses exist in any logic file. Switching from Sepolia to Mainnet requires only:

```bash
# .env
EXPO_PUBLIC_NETWORK=mainnet
```

### 8.3.2 Network-Dependent Constants Audit

| Constant | Sepolia Value | Mainnet Value | Status |
|---|---|---|---|
| `NETWORK.rpcUrl` | `https://alpha-sepolia.starknet.io` | `https://alpha-mainnet.starknet.io` | OK |
| `NETWORK.chainId` | `SN_SEPOLIA` | `SN_MAINNET` | OK |
| `NETWORK.tongoContract` | `0x0` | `0x0` | **TODO** — fill from Tongo docs |
| `NETWORK.tokens.STRK` | `0x04718f5a...` | `0x04718f5a...` | OK (same on both) |
| `NETWORK.tokens.ETH` | `0x049d365...` | `0x049d365...` | OK (same on both) |
| `NETWORK.tokens.USDC` | `0x0` | `0x053c912...` | **TODO** — Sepolia USDC needed |
| `CURATED_VALIDATORS` | Sepolia validator set | Karnot, AVNU, Braavos, etc. | OK |
| Privy App ID | Single app (both networks) | Same or separate | Verify in Privy dashboard |
| AVNU API Key | Dev key | Production key | Verify with AVNU |
| Supabase URL/Key | Dev project | Production project | Decision needed |

### 8.3.3 Pre-Mainnet Audit Checklist

Complete every item before setting `EXPO_PUBLIC_NETWORK=mainnet` in production:

```markdown
### Contract Addresses
- [ ] `NETWORK.tongoContract` filled for mainnet in `constants/network.ts:32`
- [ ] `NETWORK.tokens.USDC` filled for Sepolia in `constants/network.ts:24` (for test parity)
- [ ] Remove all `// TODO` comments from `constants/network.ts`
- [ ] Token decimal verification: STRK (18), ETH (18), USDC (6) confirmed on mainnet

### Third-Party Services
- [ ] Privy App ID confirmed for production (check allowlisted domains in Privy dashboard)
- [ ] AVNU Propulsion API key confirmed for mainnet (gas sponsorship active)
- [ ] Supabase project: production instance with RLS policies enabled
- [ ] Consider dedicated RPC provider (Alchemy, Blast, Nethermind) instead of public endpoint for reliability

### Database
- [ ] Supabase tables exist: `groups`, `group_members`, `group_invites`, `expenses`, `expense_splits`, `settlements`, `user_profiles`
- [ ] Row-Level Security (RLS) enabled on all tables
- [ ] Indexes on frequently queried columns (`group_id`, `user_id`, `created_at`)

### Observability
- [ ] Error logging: add Sentry or equivalent for production crash reporting
- [ ] Analytics (optional): Expo Insights or Mixpanel for usage tracking

### Verification
- [ ] `EXPO_PUBLIC_NETWORK=mainnet` tested with full send/receive/stake cycle
- [ ] Type check passes for both networks:
```

```bash
EXPO_PUBLIC_NETWORK=sepolia npx tsc --noEmit
EXPO_PUBLIC_NETWORK=mainnet npx tsc --noEmit
```

---

## 8.4 Build & Release

> PRD 8.4: Expo EAS Build for iOS and Android. Web build via `npx expo export`. Environment variables via EAS Secrets. App Store / Play Store submission checklist.

### 8.4.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
eas init   # Generates project ID + links to Expo account
```

### 8.4.2 `eas.json` (NEW)

Three build profiles: development (local debugging), preview (internal testing), production (store release).

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "env": {
        "EXPO_PUBLIC_NETWORK": "sepolia"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_NETWORK": "sepolia"
      },
      "channel": "preview"
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_NETWORK": "mainnet"
      },
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Key design decisions:
- **development** — Dev client for debugging, targets simulators, uses Sepolia.
- **preview** — Internal TestFlight/Firebase distribution for beta testers, uses Sepolia.
- **production** — Switches to mainnet, auto-increments build number, targets stores.
- **`channel`** fields enable EAS Update (OTA) for each environment.

### 8.4.3 `app.json` Updates

Add EAS-required fields to the existing `app.json`:

```json
{
  "expo": {
    "owner": "spiceup-team",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

`YOUR_PROJECT_ID` is auto-generated by `eas init`. Replace after running it.

### 8.4.4 EAS Secrets

Secrets are stored in EAS, not committed to the repo. Set once per project:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_PRIVY_APP_ID --value "clx..."
eas secret:create --scope project --name EXPO_PUBLIC_PRIVY_CLIENT_ID --value "client-..."
eas secret:create --scope project --name EXPO_PUBLIC_AVNU_API_KEY --value "avnu-..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

`EXPO_PUBLIC_NETWORK` is set per-profile in `eas.json`, NOT as a secret, because it differs between preview (sepolia) and production (mainnet).

### 8.4.5 Build Commands

```bash
# Development build (Expo Dev Client — for local debugging)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal distribution — for beta testers)
eas build --profile preview --platform all

# Production build (store release)
eas build --profile production --platform all

# OTA update (push JS changes without new binary)
eas update --channel production --message "Fix balance display bug"
```

### 8.4.6 Web Export

```bash
npx expo export --platform web
```

Output goes to `dist/`. Deploy to any static host:

```bash
# Vercel
npx vercel dist/

# Netlify
npx netlify deploy --dir=dist --prod

# Cloudflare Pages
npx wrangler pages deploy dist/
```

### 8.4.7 GitHub Actions CI Pipeline

**`.github/workflows/ci.yml`** (NEW)

Runs typecheck + lint + unit tests on every push and PR to `master`.

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test -- --ci --coverage
        env:
          EXPO_PUBLIC_NETWORK: sepolia
          EXPO_PUBLIC_PRIVY_APP_ID: test_privy_id
          EXPO_PUBLIC_SUPABASE_URL: https://test.supabase.co
          EXPO_PUBLIC_SUPABASE_ANON_KEY: test_key

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

Notes:
- `npm ci` for deterministic installs from `package-lock.json`.
- `EXPO_PUBLIC_*` env vars are dummy values — tests use mocks, but `lib/env.ts` throws on missing `PRIVY_APP_ID`.
- Native builds are NOT run in CI — they happen via `eas build` which has its own cloud CI.
- Coverage report uploaded as artifact for review.

### 8.4.8 App Store Submission Checklist

#### iOS — App Store Connect

```markdown
- [ ] Apple Developer account enrolled ($99/year)
- [ ] App ID registered in App Store Connect
- [ ] Bundle ID matches `app.json`: `com.spiceup.app`
- [ ] App icon: 1024x1024 in `assets/icon.png`
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 14), 5.5" (iPhone 8 Plus) — at least 3 per size
- [ ] App description, keywords, category: Finance > Payments
- [ ] Privacy policy URL (required for finance apps)
- [ ] Terms of service URL
- [ ] Age rating: 4+ (no objectionable content)
- [ ] Export compliance: uses encryption (Starknet signatures) — file self-classification report
- [ ] In-app purchases: None
- [ ] Privacy nutrition labels: collects phone number (hashed), Starknet address
- [ ] NSCameraUsageDescription set in `app.json` — already configured
- [ ] Submit: `eas submit --platform ios`
```

#### Android — Google Play Console

```markdown
- [ ] Google Play Developer account ($25 one-time)
- [ ] Package name matches `app.json`: `com.spiceup.app`
- [ ] App signing: let Google manage (recommended)
- [ ] Service account JSON for automated submission (`google-service-account.json`)
- [ ] Feature graphic: 1024x500
- [ ] Phone screenshots: at least 4
- [ ] Short description (80 chars), full description (4000 chars)
- [ ] Content rating questionnaire completed
- [ ] Target audience and content: not designed for children
- [ ] Data safety form: phone number collected, blockchain data
- [ ] Privacy policy URL
- [ ] Camera permission declared in `app.json` — already configured
- [ ] Submit: `eas submit --platform android`
```

#### Both Platforms — Pre-Submit

```markdown
- [ ] Pre-mainnet audit checklist (8.3.3) fully completed
- [ ] Production Supabase instance with RLS enabled
- [ ] Production AVNU Propulsion key registered
- [ ] Production Privy app ID with correct allowlisted origins
- [ ] `EXPO_PUBLIC_NETWORK=mainnet` in production EAS profile
- [ ] Crash reporting (Sentry) configured and verified
- [ ] Full manual test checklist (8.2.7) passed on production build
```

---

## 8.5 Grants & Funding

> PRD 8.5: Apply to Starknet Seed Grant ($25K STRK) at starknet.io/grants. Apply to AVNU Propulsion Program (up to $1M gas coverage) at propulsion.starknet.org. Register at portal.avnu.fi as Propulsion grantee after approval.

### 8.5.1 Starknet Seed Grant

**What**: Up to $25,000 in STRK for early-stage projects building on Starknet.

**Application URL**: `https://www.starknet.io/grants/`

**Application content**:

1. **Project description**: "SpiceUP is a privacy-first group payments and remittance mobile app built on Starknet. It uses Tongo for ZK confidential transfers, Starkzap v2 for wallet/staking/DCA/lending, Privy for social login, and AVNU Propulsion for gasless transactions — delivering a consumer-grade fintech experience with no seed phrases, no gas fees, and hidden transfer amounts."

2. **Problem statement**: "Remittance is expensive (6–9% average fee) and fully transparent. Crypto wallets are too complex for mainstream users. No single app combines privacy + yield + group splitting in a consumer-friendly package."

3. **Technical architecture**: Include the stack table from the PRD — React Native + Expo, Starkzap v2, Tongo, Privy, AVNU Propulsion, Supabase, Zustand. Highlight that the app uses 3 Starknet-native technologies (Tongo, Starkzap, AVNU).

4. **Demo video**: Record a 2–3 minute Loom walkthrough:
   - Login with Google (Privy) → wallet auto-created
   - Fund confidential balance → show "amount hidden" indicator
   - Send private transfer → show ZK proof generation
   - Create group → add expense → settle privately
   - Stake STRK → show APY and position

5. **Milestones**:
   - Milestone 1 (completed): Sepolia testnet launch with full feature set — 82 files, 7 categories
   - Milestone 2 (Month 1–2): Mainnet deployment with 100 beta users
   - Milestone 3 (Month 3–6): 1,000 active users, $10K+ confidential transfer volume

6. **Requested amount**: $25,000 STRK
   - Mainnet infrastructure: dedicated RPC, Supabase production, Sentry — $5K
   - Marketing to diaspora communities (social media, community events) — $10K
   - 6-month development runway for continued feature development — $10K

7. **Starknet integration depth**: Starkzap-native (wallet, staking, DCA, lending), Tongo (confidential transfers), starknet.js (RPC provider), AVNU (gas sponsorship) — all Starknet L2 native.

### 8.5.2 AVNU Propulsion Program

**What**: Up to $1M in gas coverage for Starknet dApps using AVNU's paymaster.

**Application URL**: `https://propulsion.avnu.fi/`

**Enrollment steps**:

1. **Apply** at `https://propulsion.avnu.fi/`:
   - App name: SpiceUP
   - Description: "Privacy-first group payments and remittance. All user transactions (transfers, staking, DCA, lending, group settlements) are gasless via AVNU Propulsion."
   - Starknet contract addresses the app interacts with: Tongo contract, staking pool contracts, DCA/lending contracts via Starkzap
   - Estimated monthly transaction volume: start with ~1,000 tx/month, scaling to ~10,000

2. **After approval — register at portal**:
   - Go to `https://portal.avnu.fi`
   - Create account linked to the approved application
   - Obtain production Paymaster API key
   - Replace `EXPO_PUBLIC_AVNU_API_KEY` in EAS secrets with the production key
   - Verify gasless transactions on mainnet

3. **Monitor gas consumption**:
   - Use AVNU dashboard at `portal.avnu.fi` to track sponsored gas
   - Set budget alerts if available
   - Plan for volume growth — request increased allocation as user base grows

### 8.5.3 Grant Application Materials Checklist

```markdown
- [ ] 1-page project summary (PDF) — problem, solution, stack, team
- [ ] Technical architecture diagram (Starknet, Tongo ZK layer, Starkzap SDK, Privy auth, AVNU paymaster, Supabase backend)
- [ ] Demo video (2–3 min Loom) — login, fund, send private, groups, earn
- [ ] Screenshots of all major flows (home, send, receive, groups, earn, settings)
- [ ] Metrics plan: MAU, transaction volume, confidential transfer volume, TVL in staking
- [ ] 6-month roadmap with milestones and deliverables
- [ ] GitHub repository link (or willingness to share access privately)
- [ ] Contact info: email, Telegram handle, Discord for Starknet ecosystem
- [ ] Team background: developer experience, previous projects, Starknet ecosystem involvement
```

---

## Files Modified / Created

| File | Action | Maps to PRD |
|---|---|---|
| `jest.config.js` | NEW | 8.1 |
| `__mocks__/setup.ts` | NEW | 8.1 |
| `__mocks__/starkzap.ts` | NEW | 8.1 |
| `__mocks__/starkzap-native.ts` | NEW | 8.1 |
| `__mocks__/supabase.ts` | NEW | 8.1 |
| `__tests__/lib/tongo.test.ts` | NEW | 8.1 |
| `__tests__/lib/groups.test.ts` | NEW | 8.1 |
| `__tests__/lib/format.test.ts` | NEW | 8.1 |
| `__tests__/lib/txHistory.test.ts` | NEW | 8.1 |
| `__tests__/lib/dca.test.ts` | NEW | 8.1 |
| `__tests__/stores/auth.test.ts` | NEW | 8.1 |
| `__tests__/stores/wallet.test.ts` | NEW | 8.1 |
| `__tests__/stores/earn.test.ts` | NEW | 8.1 |
| `__tests__/stores/groups.test.ts` | NEW | 8.1 |
| `__tests__/stores/toast.test.ts` | NEW | 8.1 |
| `__tests__/constants/tokens.test.ts` | NEW | 8.1 |
| `e2e/config.yaml` | NEW | 8.2 |
| `e2e/flows/**/*.yaml` | NEW (12 files) | 8.2 |
| `eas.json` | NEW | 8.4 |
| `.github/workflows/ci.yml` | NEW | 8.4 |
| `package.json` | EXTEND (scripts + devDeps) | 8.1, 8.4 |
| `app.json` | EXTEND (EAS fields) | 8.4 |

---

## Verification Checklist

```bash
# ── 8.1 Unit Tests ────────────────────────────────────────────────────────────
npm install                          # install new devDependencies
npx tsc --noEmit                     # 0 TypeScript errors (including test files)
npm test                             # all 11 test files pass
npm run test:coverage                # coverage report generated in coverage/

# ── 8.2 Integration Tests ────────────────────────────────────────────────────
maestro test e2e/flows/auth/login.yaml    # login flow passes (requires running app)
maestro test e2e/flows/                   # all flows pass (device with Sepolia funds)
# Complete manual test checklist (8.2.7) on physical device

# ── 8.3 Network Configuration ────────────────────────────────────────────────
EXPO_PUBLIC_NETWORK=sepolia npx tsc --noEmit    # compiles
EXPO_PUBLIC_NETWORK=mainnet npx tsc --noEmit    # compiles
# Complete pre-mainnet audit checklist (8.3.3) before going live

# ── 8.4 Build & Release ──────────────────────────────────────────────────────
eas build --profile development --platform ios    # build succeeds
eas build --profile preview --platform all        # build succeeds
npx expo export --platform web                    # dist/ generated
# Push a PR to master → GitHub Actions CI passes (typecheck + lint + test)

# ── 8.5 Grants ───────────────────────────────────────────────────────────────
# Starknet Seed Grant application submitted at starknet.io/grants
# AVNU Propulsion Program application submitted at propulsion.avnu.fi
# Grant application materials checklist (8.5.3) complete
```
