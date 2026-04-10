// Typed access to EXPO_PUBLIC_* env vars. Throws at module load if required vars are missing.
const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

export const ENV = {
  NETWORK: (process.env.EXPO_PUBLIC_NETWORK ?? "sepolia") as "sepolia" | "mainnet",
  PRIVY_APP_ID: required("EXPO_PUBLIC_PRIVY_APP_ID", process.env.EXPO_PUBLIC_PRIVY_APP_ID),
  PRIVY_CLIENT_ID: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
  AVNU_API_KEY: process.env.EXPO_PUBLIC_AVNU_API_KEY ?? "",
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
