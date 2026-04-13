/**
 * Typed environment variable access for SpiceUP
 * Validates required env vars at access time
 */

const required = (key: string, value: string | undefined): string => {
  if (!value) {
    // During dev/build, PRIVY_APP_ID may be empty — that's ok for Cat 1
    if (key === "NEXT_PUBLIC_PRIVY_APP_ID") return "";
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const ENV = {
  /** Current Starknet network: "sepolia" or "mainnet" */
  NETWORK: (process.env.NEXT_PUBLIC_NETWORK ?? "sepolia") as "sepolia" | "mainnet",

  /** Privy App ID for authentication */
  PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",

  /** AVNU Propulsion API key for gasless transactions */
  AVNU_API_KEY: process.env.NEXT_PUBLIC_AVNU_API_KEY ?? "",

  /** Supabase project URL */
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",

  /** Supabase anonymous key */
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
