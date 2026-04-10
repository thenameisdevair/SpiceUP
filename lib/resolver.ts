import { supabase } from "./supabase";
import * as Crypto from "expo-crypto";
import type { GroupMember } from "./groups";

async function hashPhone(phone: string): Promise<string> {
  const normalized = phone.replace(/\s/g, "");
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
}

/** Resolve a phone number to a GroupMember. Returns null if not registered in SpiceUP. */
export async function resolvePhone(phone: string): Promise<GroupMember | null> {
  const hash = await hashPhone(phone);
  const { data } = await supabase
    .from("user_profiles")
    .select("privy_user_id, tongo_id, starknet_address, display_name")
    .eq("phone_hash", hash)
    .single();

  if (!data) return null;

  return {
    userId: (data as any).privy_user_id,
    tongoId: (data as any).tongo_id,
    starknetAddress: (data as any).starknet_address,
    displayName: (data as any).display_name,
    phoneHash: hash,
  };
}

/** Register or update the current user's profile. Call after phone OTP verification. */
export async function registerProfile(
  privyUserId: string,
  phone: string,
  starknetAddress: string,
  tongoId: string
): Promise<void> {
  const hash = await hashPhone(phone);
  await supabase.from("user_profiles").upsert(
    {
      privy_user_id: privyUserId,
      phone_hash: hash,
      starknet_address: starknetAddress,
      tongo_id: tongoId,
      display_name: phone,
    },
    { onConflict: "privy_user_id" }
  );
}
