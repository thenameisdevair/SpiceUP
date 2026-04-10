import { TongoConfidential, type Address } from "starkzap";
import * as Crypto from "expo-crypto";
import { provider } from "@/lib/starkzap";
import { NETWORK } from "@/constants/network";
import { secureGet, secureSet } from "@/lib/secure";

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

export function initTongo(privateKey: string): TongoConfidential {
  return new TongoConfidential({
    privateKey,
    contractAddress: NETWORK.tongoContract as Address,
    provider,
  });
}
