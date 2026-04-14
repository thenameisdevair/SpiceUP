/**
 * Typed environment variable access for SpiceUP
 * Required vars throw at access time if missing.
 */

const isBrowser = typeof window !== "undefined";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    // Allow empty values during SSR build (Next.js compiles pages without env at build time)
    if (!isBrowser) return "";
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const ENV = {
  /** Current Starknet network: "sepolia" or "mainnet" */
  NETWORK: (process.env.NEXT_PUBLIC_NETWORK ?? "sepolia") as
    | "sepolia"
    | "mainnet",

  /** Privy App ID for authentication (required) */
  PRIVY_APP_ID: required("NEXT_PUBLIC_PRIVY_APP_ID"),

  /** AVNU Propulsion API key for gasless transactions */
  AVNU_API_KEY: process.env.NEXT_PUBLIC_AVNU_API_KEY ?? "",

  /** Supabase project URL (required) */
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),

  /** Supabase anonymous key (required) */
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),

  /** Optional dedicated RPC URL override (falls back to public endpoint) */
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL ?? "",

  /** Optional Starknet Sepolia RPC URL override */
  RPC_URL_SEPOLIA: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? "",

  /** Optional Starknet Mainnet RPC URL override */
  RPC_URL_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_MAINNET ?? "",
} as const;
