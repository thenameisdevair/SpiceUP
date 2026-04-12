// Heavy starkzap imports are lazy-loaded to avoid pulling the full module chain at startup.
import type { Address, Token, ConfidentialRecipient, TongoConfidential } from "starkzap";
import type { OnboardResult } from "starkzap";
import * as Crypto from "expo-crypto";
import { getProvider } from "@/lib/starkzap";
import { NETWORK } from "@/constants/network";
import { secureGet, secureSet } from "@/lib/secure";

function starkzap() {
  return require("starkzap") as typeof import("starkzap");
}

// 32-byte random hex, suitable as a Tongo private key.
export async function generateTongoPrivateKey(): Promise<string> {
  const bytes = Crypto.getRandomBytes(32);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateTongoKey(): Promise<string> {
  const existing = await secureGet("tongoPrivateKey");
  if (existing) return existing;
  const fresh = await generateTongoPrivateKey();
  await secureSet("tongoPrivateKey", fresh);
  return fresh;
}

export function initTongo(privateKey: string) {
  const { TongoConfidential } = starkzap();
  return new TongoConfidential({
    privateKey,
    contractAddress: NETWORK.tongoContract as Address,
    provider: getProvider(),
  });
}

// ---------------------------------------------------------------------------
// QR parsing
// ---------------------------------------------------------------------------

/** Parse a "tongo:<x>:<y>" QR string into a ConfidentialRecipient. Returns null on bad format. */
export function parseTongoQr(input: string): ConfidentialRecipient | null {
  const match = input.match(/^tongo:(.+):(.+)$/);
  if (!match) return null;
  try {
    return { x: BigInt(match[1]), y: BigInt(match[2]) };
  } catch {
    return null;
  }
}

export function isValidTongoAddress(input: string): boolean {
  return parseTongoQr(input) !== null;
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

/** Move public ERC20 tokens into the confidential balance. */
export async function fundConfidential(
  onboard: OnboardResult,
  tongo: TongoConfidential,
  amountStr: string,
  token: Token
) {
  const w = onboard.wallet;
  const amount = starkzap().Amount.parse(amountStr, token);
  return w.tx().confidentialFund(tongo, { amount, sender: w.address }).send();
}

/** Confidential transfer to another Tongo recipient (generates ZK proof). */
export async function sendPrivate(
  onboard: OnboardResult,
  tongo: TongoConfidential,
  recipientId: ConfidentialRecipient,
  amountStr: string,
  token: Token
) {
  const w = onboard.wallet;
  const amount = starkzap().Amount.parse(amountStr, token);
  return w
    .tx()
    .confidentialTransfer(tongo, { amount, to: recipientId, sender: w.address })
    .send();
}

/** Withdraw from confidential balance back to a public ERC20 address. */
export async function withdrawConfidential(
  onboard: OnboardResult,
  tongo: TongoConfidential,
  amountStr: string,
  token: Token,
  toAddress: Address
) {
  const w = onboard.wallet;
  const amount = starkzap().Amount.parse(amountStr, token);
  return w
    .tx()
    .confidentialWithdraw(tongo, { amount, to: toAddress, sender: w.address })
    .send();
}

/**
 * Emergency full withdrawal — drains the entire confidential account.
 * Uses tongo.ragequit() + wallet.execute() because TxBuilder has no confidentialRagequit.
 */
export async function ragequit(
  onboard: OnboardResult,
  tongo: TongoConfidential,
  toAddress: Address
) {
  const w = onboard.wallet;
  const calls = await tongo.ragequit({ to: toAddress, sender: w.address });
  return w.execute(calls);
}
