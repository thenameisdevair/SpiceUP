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
