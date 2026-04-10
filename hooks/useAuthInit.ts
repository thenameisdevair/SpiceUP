// After Privy reports isReady + user is set, run:
//   1. Ensure a Starknet embedded wallet exists (create if missing)
//   2. Build Privy resolver and call sdk.onboard() → wallet instance
//   3. Load or generate the Tongo private key → TongoConfidential instance
//   4. Push everything into useAuthStore
import { useEffect } from "react";
import { usePrivy } from "@privy-io/expo";
import { useCreateWallet, useSignRawHash } from "@privy-io/expo/extended-chains";
import { initWallet } from "@/lib/starkzap";
import { buildPrivyResolver } from "@/lib/privy-signer";
import { getOrCreateTongoKey, initTongo } from "@/lib/tongo";
import { useAuthStore } from "@/stores/auth";
import { registerProfile } from "@/lib/resolver";

export function useAuthInit() {
  const { user, isReady } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const store = useAuthStore();

  useEffect(() => {
    if (!isReady || !user || store.status !== "idle") return;
    (async () => {
      try {
        store.setStatus("initializing");

        // 1. Find or create Starknet wallet via Privy
        const starknetAcct = user.linked_accounts?.find(
          (a: any) => a.chain_type === "starknet",
        );
        let address: string;
        let walletId: string;
        let publicKey: string;

        if (starknetAcct) {
          address = (starknetAcct as any).address;
          walletId = (starknetAcct as any).id ?? (starknetAcct as any).wallet_id ?? "";
          publicKey = (starknetAcct as any).public_key ?? "";
        } else {
          const created = await createWallet({ chainType: "starknet" });
          address = created.wallet.address;
          walletId = (created.wallet as any).id ?? "";
          publicKey = (created.wallet as any).public_key ?? "";
        }

        // 2. Starkzap onboard via Privy strategy
        const resolver = buildPrivyResolver(walletId, publicKey, signRawHash, address);
        const onboardResult = await initWallet(resolver);

        // 3. Tongo
        const tongoKey = await getOrCreateTongoKey();
        const tongo = initTongo(tongoKey);
        const tongoRecipientId = tongo.recipientId;

        store.setIdentity({
          privyUserId: user.id,
          starknetAddress: address,
          tongoRecipientId,
          wallet: onboardResult,
          tongo,
        });

        // Register/update profile in Supabase for phone-based group member lookup
        const phoneAccount = user.linked_accounts?.find(
          (a: any) => a.type === "phone"
        );
        const phone: string =
          (phoneAccount as any)?.phoneNumber ?? (phoneAccount as any)?.number ?? "";
        if (phone) {
          const tongoId = `tongo:${tongoRecipientId.x}:${tongoRecipientId.y}`;
          registerProfile(user.id, phone, address, tongoId).catch(() => {
            /* best-effort — non-blocking */
          });
        }
      } catch (e: any) {
        store.setStatus("error", e.message ?? String(e));
      }
    })();
  }, [isReady, user?.id]);
}
