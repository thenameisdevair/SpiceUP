// Adapter: builds the resolve function that Starkzap's Privy onboard strategy expects.
//
// Starkzap OnboardPrivyOptions.privy.resolve() must return:
//   { walletId, publicKey, rawSign?, headers?, buildBody? }
//
// Privy Expo hooks provide:
//   useCreateWallet({ chainType: "starknet" }) → { wallet: { id, address, public_key } }
//   useSignRawHash({ address, chainType: "starknet", hash }) → { signature }

import type { OnboardPrivyResolveResult } from "starkzap";

type SignRawHashFn = (args: {
  address: string;
  chainType: "starknet";
  hash: `0x${string}`;
}) => Promise<{ signature: `0x${string}` }>;

export function buildPrivyResolver(
  walletId: string,
  publicKey: string,
  signRawHash: SignRawHashFn,
  address: string,
): () => Promise<OnboardPrivyResolveResult> {
  return async () => ({
    walletId,
    publicKey,
    rawSign: async (_walletId: string, messageHash: string) => {
      const { signature } = await signRawHash({
        address,
        chainType: "starknet",
        hash: messageHash as `0x${string}`,
      });
      return signature;
    },
  });
}
