# Category 2 — Auth & Identity (Detailed Plan)

> **Goal**: Users can sign in with Google or email OTP. On first login, a Starknet wallet is created via Privy's embedded wallet (Starknet chain), a separate Tongo private key is generated and stored in SecureStore, and the user lands on a placeholder home screen showing their addresses. Returning users skip onboarding and go straight to home.

---

## 1. Context

**Why this category exists**: SpiceUP's whole UX pitch is "no seed phrases, gasless, private by default". That promise lives or dies in auth. Before we can show balances (Cat 3), send private transfers (Cat 4), or split group expenses (Cat 5), every user needs:

1. A stable identity (Privy user ID — survives across devices)
2. A Starknet account (embedded wallet, managed by Privy, deployable on first tx)
3. A Tongo private key (separate from Starknet key, stored only on device)
4. An authenticated app session that gates all app routes

**Where we're starting**: Cat 1 is complete — Expo SDK 55 project boots, polyfills load, `app/_layout.tsx` is a bare `Stack`, `app/index.tsx` shows a "SpiceUP" placeholder. All runtime deps for auth are already in `package.json` (`@privy-io/expo@^0.64.0`, `starkzap-native@^2.0.0`, `expo-secure-store`, `expo-crypto`, `zustand`).

**Where we land**: Unauthenticated users see `/(auth)/login`. Authenticated users see `/(app)/home` with their Starknet address and Tongo recipient ID. The wallet + Tongo instances are in a Zustand store, ready for Cat 3 to query balances from.

**Intended outcome**: Auth flow works end-to-end on web (easiest to test), with mobile compatibility preserved. Privy App ID + a placeholder AVNU key are wired through env. Tongo key generation + persistence is proven. No business logic beyond identity.

---

## 2. What We're Building (Deliverables)

1. **Privy provider wired into root layout** with email OTP + Google OAuth + Starknet embedded wallets
2. **Auth guard** — redirects unauthenticated users to `/(auth)/login`, authenticated users to `/(app)/home`
3. **Auth screens**: `login`, `otp`, `phone`, `onboard` (Privy-backed)
4. **Authenticated shell**: `/(app)/_layout.tsx` + `/(app)/home.tsx` + `/(app)/settings.tsx`
5. **Starkzap SDK initialization** via `lib/starkzap.ts` (sdk singleton + `initWallet()`)
6. **Privy → Starkzap signer adapter** — converts Privy's Starknet signer to Starkzap's signer interface
7. **Tongo key management** via `lib/tongo.ts` (generate, persist in SecureStore, init TongoConfidential)
8. **Zustand auth store** (`stores/auth.ts`) holding Privy user, wallet, Tongo instance, addresses
9. **Network config module** (`constants/network.ts`) — RPC URL, chain ID, Tongo contract, token addresses per network, switched by `EXPO_PUBLIC_NETWORK`
10. **Typed env loader** (`lib/env.ts`) — reads Expo public env vars with type safety

Success = Running `npx expo start --clear`, logging in via email OTP in browser, seeing a home screen that displays the Starknet address + Tongo recipient ID, closing and reopening the app finds the user already logged in with the same Tongo key.

---

## 3. CRITICAL BLOCKER: Fix `starkzap` Package Resolution

**Discovered during planning**: `starkzap-native@2.0.0` declares `"starkzap": "file:../.."` in its `package.json` — a monorepo-local path that npm resolved incorrectly during Cat 1. The result is a broken symlink at `node_modules/starkzap → ..` which points `require('starkzap')` at `SpiceUP/index.ts` (our polyfill entry), not the real Starkzap core SDK.

**Proof**:
```bash
$ ls -la node_modules/starkzap
lrwxrwxrwx ... node_modules/starkzap -> ..
$ node -e "console.log(require.resolve('starkzap'))"
/home/devair/Documents/SpiceUP/index.ts   # ← wrong
```

**Consequence**: Any import like `import { TongoConfidential, OnboardStrategy } from "starkzap"` will fail at runtime OR silently import from our entry file. Cat 1 didn't hit this because it never actually imported from the SDK — it only booted the polyfills and rendered a static view.

**Fix (first step of Cat 2)**:
```bash
# Remove the broken symlink first
rm /home/devair/Documents/SpiceUP/node_modules/starkzap
# Install the real starkzap package from npm (v2.0.0 is published)
npm install starkzap@2.0.0 --legacy-peer-deps
```

After this, `require.resolve('starkzap')` should return a path inside `node_modules/starkzap/dist/`. The real package pulls in `@avnu/avnu-sdk@^4.1.0-rc.0` and `starknet@^9.2.1` automatically.

**Verification after fix**:
```bash
node -e "console.log(require.resolve('starkzap'))"
# Expect: node_modules/starkzap/dist/index.js (NOT SpiceUP/index.ts)
node -e "const s = require('starkzap'); console.log(Object.keys(s).slice(0, 20))"
# Expect: list of exports including StarkZap, TongoConfidential, OnboardStrategy etc.
```

This step **must** complete before any code in Cat 2 can be written or tested. Flag as risk: if `starkzap-native` has internal code that bundles `starkzap` at build time, the npm-installed version may still conflict. Fallback: contact author (`0xLucqs`) or pin to a git commit.

---

## 4. Tools & Accounts Needed (Outside the Repo)

| Tool | Purpose | How to Get | Required For |
|---|---|---|---|
| **Privy account** | Issuer for embedded wallets + OAuth | Sign up at `dashboard.privy.io`, create an app, copy the App ID | **Required** — no auth without it |
| **Privy Starknet chain enabled** | Embedded Starknet wallets | In Privy dashboard → Configuration → Chains → enable Starknet (Sepolia + Mainnet) | **Required** |
| **Privy OAuth redirect** | Google login callback | In Privy dashboard → Login Methods → Google → add `spiceup://login-callback` and `http://localhost:8081` | Required for Google OAuth (email OTP works without it) |
| **AVNU Propulsion API key** | Gasless tx sponsorship | Apply at `propulsion.starknet.org`, then register at `portal.avnu.fi`. **Placeholder OK for Cat 2** | Not strictly required until tx sending (Cat 3/4) — can use empty string now |
| **Google Cloud OAuth client** (optional) | If Privy requires your own Google client ID | `console.cloud.google.com` → OAuth 2.0 → Web client | Only if Privy doesn't proxy Google auth (check Privy docs) |

**Verdict**: Only the Privy App ID is a hard blocker. AVNU can be stubbed for now — we'll configure the paymaster but the placeholder key is harmless until we attempt a gasless transaction in Cat 3.

---

## 5. Package Dependencies

### 5.1 New installs (verify peer deps)

`@privy-io/expo@^0.64.0` declares peer dependencies that were NOT auto-installed in Cat 1. Run `npm ls` to find what's missing, then install:

```bash
# Privy Expo peer deps
npx expo install expo-application expo-web-browser expo-apple-authentication
npm install --legacy-peer-deps @privy-io/expo-native-extensions react-native-webview
# Passkey support (optional, for future — Privy loads it lazily)
npm install --legacy-peer-deps react-native-passkeys
```

### 5.2 Starkzap core (from blocker fix above)

```bash
npm install --legacy-peer-deps starkzap@2.0.0
```

This drags in `@avnu/avnu-sdk` and `starknet@^9.2.1`.

### 5.3 Already installed (verify present)

- `@privy-io/expo` ✓
- `starkzap-native` ✓
- `expo-secure-store` ✓
- `expo-crypto` ✓
- `expo-router` ✓
- `zustand` ✓
- `expo-linking` ✓ (from Cat 1)

### 5.4 Verification

```bash
npm ls @privy-io/expo starkzap starkzap-native expo-secure-store zustand
npx expo-doctor
# Expect: 17/17 checks still passing
```

---

## 6. Directory Structure to Create

```
SpiceUP/
├── app/
│   ├── _layout.tsx                 ← REPLACE: add PrivyProvider + auth guard
│   ├── index.tsx                   ← REPLACE: splash/redirect based on auth
│   ├── (auth)/
│   │   ├── _layout.tsx             ← NEW: Stack for auth flow
│   │   ├── onboard.tsx             ← NEW: 3-slide intro (simple version)
│   │   ├── login.tsx               ← NEW: Email + Google buttons
│   │   ├── otp.tsx                 ← NEW: 6-digit OTP entry
│   │   └── phone.tsx               ← NEW: phone number collection (local only)
│   └── (app)/
│       ├── _layout.tsx             ← NEW: Stack for authenticated screens
│       ├── home.tsx                ← NEW: shows addresses, logout button
│       └── settings.tsx            ← NEW: address display, export key, logout
├── lib/
│   ├── env.ts                      ← NEW: typed env access
│   ├── secure.ts                   ← NEW: SecureStore wrapper with typed keys
│   ├── starkzap.ts                 ← NEW: SDK singleton + initWallet()
│   ├── tongo.ts                    ← NEW: Tongo key gen/load + initTongo()
│   └── privy-signer.ts             ← NEW: Privy → Starkzap signer adapter
├── hooks/
│   ├── useAuthInit.ts              ← NEW: orchestrates post-login setup
│   └── useAuthGuard.ts             ← NEW: guards routes based on auth state
├── stores/
│   └── auth.ts                     ← NEW: Zustand auth store (also acceptable under lib/stores/)
└── constants/
    └── network.ts                  ← NEW: per-network RPC, chainId, contracts
```

---

## 7. Step-by-Step Build Sequence

### Step 7.1 — Fix starkzap package (blocker)
```bash
cd /home/devair/Documents/SpiceUP
source ~/.nvm/nvm.sh && nvm use 22
rm node_modules/starkzap
npm install --legacy-peer-deps starkzap@2.0.0
node -e "console.log(require.resolve('starkzap'))"
# Must print path inside node_modules/starkzap/dist/
```

### Step 7.2 — Install Privy peer deps
```bash
npx expo install expo-application expo-web-browser expo-apple-authentication
npm install --legacy-peer-deps @privy-io/expo-native-extensions react-native-webview react-native-passkeys
npx expo-doctor
```

### Step 7.3 — Inspect Starkzap core types
```bash
# Read these to confirm exact API shape before writing lib/starkzap.ts and lib/tongo.ts:
node_modules/starkzap/dist/index.d.ts
node_modules/starkzap/dist/sdk.d.ts          # StarkZap class
node_modules/starkzap/dist/types/onboard.d.ts  # OnboardStrategy, OnboardOptions
node_modules/starkzap/dist/tongo/*.d.ts      # TongoConfidential constructor + methods
```
If any of the API shapes below don't match the real types, adjust the exact field names during implementation.

### Step 7.4 — Create env, secure store, network config
Files: `lib/env.ts`, `lib/secure.ts`, `constants/network.ts`. See Section 8 for contents.

### Step 7.5 — Create Starkzap + Tongo + signer adapter
Files: `lib/starkzap.ts`, `lib/tongo.ts`, `lib/privy-signer.ts`. See Section 8.

### Step 7.6 — Create Zustand auth store
File: `stores/auth.ts`. See Section 8.

### Step 7.7 — Create hooks
Files: `hooks/useAuthInit.ts`, `hooks/useAuthGuard.ts`.

### Step 7.8 — Build auth screens
Files: `app/(auth)/_layout.tsx`, `login.tsx`, `otp.tsx`, `phone.tsx`, `onboard.tsx`.

### Step 7.9 — Build app shell screens
Files: `app/(app)/_layout.tsx`, `home.tsx`, `settings.tsx`.

### Step 7.10 — Replace root layout + index
Files: `app/_layout.tsx` (wrap in PrivyProvider), `app/index.tsx` (redirect splash).

### Step 7.11 — Update env files
Add the real Privy App ID to `.env` (user must supply). Update `.env.example` with the new keys.

### Step 7.12 — Verify
```bash
npx tsc --noEmit       # 0 errors
npx expo-doctor        # 17/17 pass
npx expo start --clear # press 'w' for web
```
Manual checks — see Section 9.

---

## 8. File Contents (Exact or Skeletons)

### 8.1 `lib/env.ts`
```ts
// Typed access to EXPO_PUBLIC_* env vars. Throws at module load if required vars are missing.
const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

export const ENV = {
  NETWORK: (process.env.EXPO_PUBLIC_NETWORK ?? "sepolia") as "sepolia" | "mainnet",
  PRIVY_APP_ID: required("EXPO_PUBLIC_PRIVY_APP_ID", process.env.EXPO_PUBLIC_PRIVY_APP_ID),
  PRIVY_CLIENT_ID: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID, // optional
  AVNU_API_KEY: process.env.EXPO_PUBLIC_AVNU_API_KEY ?? "",
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
```

### 8.2 `constants/network.ts`
```ts
import { ENV } from "@/lib/env";

type NetworkConfig = {
  name: "sepolia" | "mainnet";
  chainId: string;              // "SN_SEPOLIA" | "SN_MAINNET"
  rpcUrl: string;
  tongoContract: string;        // deployed Tongo contract address
  tokens: {
    STRK: string;
    ETH: string;
    USDC: string;
  };
};

const SEPOLIA: NetworkConfig = {
  name: "sepolia",
  chainId: "SN_SEPOLIA",
  rpcUrl: "https://alpha-sepolia.starknet.io",
  tongoContract: "0x0",  // TODO: fill from Tongo docs when available
  tokens: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH:  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x0",  // TODO: sepolia USDC address
  },
};

const MAINNET: NetworkConfig = {
  name: "mainnet",
  chainId: "SN_MAINNET",
  rpcUrl: "https://alpha-mainnet.starknet.io",
  tongoContract: "0x0",  // TODO
  tokens: {
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    ETH:  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    USDC: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  },
};

export const NETWORK: NetworkConfig = ENV.NETWORK === "mainnet" ? MAINNET : SEPOLIA;
```
> Note: Token addresses in PRD are placeholders — will be verified / filled during Cat 3. For Cat 2 we just need the config module to exist and compile.

### 8.3 `lib/secure.ts`
```ts
import * as SecureStore from "expo-secure-store";

const KEYS = {
  tongoPrivateKey: "spiceup.tongo.privateKey",
  phoneNumber: "spiceup.user.phone",
} as const;
type Key = keyof typeof KEYS;

export async function secureGet(key: Key): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS[key]);
}

export async function secureSet(key: Key, value: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS[key], value);
}

export async function secureDelete(key: Key): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS[key]);
}
```

### 8.4 `lib/starkzap.ts`
```ts
// SDK singleton + wallet initialization.
// NOTE: exact API field names must be verified against node_modules/starkzap/dist/*.d.ts
// during implementation. The structure below follows the PRD.
import { StarkZap } from "starkzap-native";
import { RpcProvider } from "starknet";
import { NETWORK } from "@/constants/network";
import { ENV } from "@/lib/env";

let sdkInstance: StarkZap | null = null;
export const provider = new RpcProvider({ nodeUrl: NETWORK.rpcUrl });

export function getSdk(): StarkZap {
  if (!sdkInstance) {
    sdkInstance = new StarkZap({
      network: NETWORK.name,
      provider,
      paymaster: {
        apiKey: ENV.AVNU_API_KEY,
        feeMode: "sponsored",
      },
    } as any); // cast until real SDKConfig type is confirmed
  }
  return sdkInstance;
}

// Called from hooks/useAuthInit.ts after Privy reports a Starknet wallet is ready.
export async function initWallet(privySigner: unknown) {
  const sdk = getSdk();
  const wallet = await sdk.onboard({
    strategy: "privy",          // confirm exact literal from OnboardStrategy enum
    signer: privySigner,
    deploy: "if_needed",
  } as any);
  return wallet;
}
```

### 8.5 `lib/privy-signer.ts`
```ts
// Adapter: takes Privy's extended-chains Starknet hooks output and returns
// an object implementing Starkzap's expected signer interface.
//
// Privy exposes:
//   useCreateWallet({ chainType: 'starknet' })  → creates wallet, returns address
//   useSignRawHash()  → signRawHash({ address, chainType: 'starknet', hash }) → { signature }
//
// Starkzap's Privy onboard strategy may accept the raw Privy client instead —
// during implementation, prefer the SDK's native Privy hook if it exists.
// This adapter is the fallback.
type SignRawHashFn = (args: {
  address: string;
  chainType: "starknet";
  hash: `0x${string}`;
}) => Promise<{ signature: `0x${string}` }>;

export function createPrivyStarknetSigner(address: string, signRawHash: SignRawHashFn) {
  return {
    address,
    async signMessage(hash: string) {
      const { signature } = await signRawHash({
        address,
        chainType: "starknet",
        hash: hash as `0x${string}`,
      });
      return signature;
    },
  };
}
```

### 8.6 `lib/tongo.ts`
```ts
import { TongoConfidential } from "starkzap";   // core package
import * as Crypto from "expo-crypto";
import { provider } from "@/lib/starkzap";
import { NETWORK } from "@/constants/network";
import { secureGet, secureSet } from "@/lib/secure";

// 32-byte random hex, suitable as a Tongo private key.
// (If starkzap exposes a dedicated generator, prefer that.)
export async function generateTongoPrivateKey(): Promise<string> {
  const bytes = Crypto.getRandomBytes(32);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateTongoKey(): Promise<string> {
  const existing = await secureGet("tongoPrivateKey");
  if (existing) return existing;
  const fresh = await generateTongoPrivateKey();
  await secureSet("tongoPrivateKey", fresh);
  return fresh;
}

export function initTongo(privateKey: string): TongoConfidential {
  return new TongoConfidential(privateKey, NETWORK.tongoContract, provider);
}
```

### 8.7 `stores/auth.ts`
```ts
import { create } from "zustand";

type Status = "idle" | "initializing" | "ready" | "error";

interface AuthState {
  status: Status;
  error: string | null;

  privyUserId: string | null;
  starknetAddress: string | null;
  tongoRecipientId: string | null;

  // Instances (not persisted — rebuilt on each session)
  wallet: unknown | null;
  tongo: unknown | null;

  setStatus: (s: Status, error?: string | null) => void;
  setIdentity: (p: {
    privyUserId: string;
    starknetAddress: string;
    tongoRecipientId: string;
    wallet: unknown;
    tongo: unknown;
  }) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "idle",
  error: null,
  privyUserId: null,
  starknetAddress: null,
  tongoRecipientId: null,
  wallet: null,
  tongo: null,
  setStatus: (status, error = null) => set({ status, error }),
  setIdentity: (p) => set({ ...p, status: "ready", error: null }),
  reset: () => set({
    status: "idle", error: null,
    privyUserId: null, starknetAddress: null, tongoRecipientId: null,
    wallet: null, tongo: null,
  }),
}));
```

### 8.8 `hooks/useAuthInit.ts`
```ts
// After Privy reports isReady + user is set, run:
//   1. Ensure a Starknet embedded wallet exists (create if missing)
//   2. Call sdk.onboard() with the Privy signer → wallet instance
//   3. Load or generate the Tongo private key → TongoConfidential instance
//   4. Push everything into useAuthStore
import { useEffect } from "react";
import { usePrivy } from "@privy-io/expo";
import { useCreateWallet, useSignRawHash } from "@privy-io/expo/extended-chains";
import { initWallet } from "@/lib/starkzap";
import { createPrivyStarknetSigner } from "@/lib/privy-signer";
import { getOrCreateTongoKey, initTongo } from "@/lib/tongo";
import { useAuthStore } from "@/stores/auth";

export function useAuthInit() {
  const { user, isReady } = usePrivy();
  const createWallet = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const store = useAuthStore();

  useEffect(() => {
    if (!isReady || !user || store.status !== "idle") return;
    (async () => {
      try {
        store.setStatus("initializing");
        // 1. Find or create Starknet wallet via Privy
        const starknetAcct = user.linked_accounts?.find(
          (a: any) => a.chain_type === "starknet"
        );
        const address = starknetAcct?.address
          ?? (await createWallet({ chainType: "starknet" })).wallet.address;

        // 2. Starkzap onboard
        const signer = createPrivyStarknetSigner(address, signRawHash);
        const wallet = await initWallet(signer);

        // 3. Tongo
        const tongoKey = await getOrCreateTongoKey();
        const tongo = initTongo(tongoKey);
        const tongoRecipientId = (tongo as any).recipientId ?? "pending";

        store.setIdentity({
          privyUserId: user.id,
          starknetAddress: address,
          tongoRecipientId,
          wallet,
          tongo,
        });
      } catch (e: any) {
        store.setStatus("error", e.message ?? String(e));
      }
    })();
  }, [isReady, user?.id]);
}
```

### 8.9 `hooks/useAuthGuard.ts`
```ts
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { usePrivy } from "@privy-io/expo";

export function useAuthGuard() {
  const { user, isReady } = usePrivy();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) router.replace("/(auth)/login");
    else if (user && inAuthGroup) router.replace("/(app)/home");
  }, [isReady, user, segments]);
}
```

### 8.10 `app/_layout.tsx` (REPLACE)
```tsx
import { Slot } from "expo-router";
import { PrivyProvider } from "@privy-io/expo";
import { ENV } from "@/lib/env";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthInit } from "@/hooks/useAuthInit";
import "../global.css";

function Gate() {
  useAuthGuard();
  useAuthInit();
  return <Slot />;
}

export default function RootLayout() {
  return (
    <PrivyProvider
      appId={ENV.PRIVY_APP_ID}
      clientId={ENV.PRIVY_CLIENT_ID}
      supportedChains={[
        // Starknet Sepolia + Mainnet chain objects — exact literals must come
        // from the Privy Starknet chain config, confirm during implementation
      ]}
    >
      <Gate />
    </PrivyProvider>
  );
}
```

### 8.11 `app/index.tsx` (REPLACE)
```tsx
import { View, ActivityIndicator } from "react-native";

export default function Splash() {
  // useAuthGuard in root layout handles the redirect; this is a neutral splash.
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#7B5EA7" />
    </View>
  );
}
```

### 8.12 `app/(auth)/_layout.tsx`
```tsx
import { Stack } from "expo-router";
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 8.13 `app/(auth)/login.tsx`
```tsx
import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useLoginWithEmail, useLoginWithOAuth } from "@privy-io/expo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const emailFlow = useLoginWithEmail();
  const oauthFlow = useLoginWithOAuth();

  async function sendOtp() {
    await emailFlow.sendCode({ email });
    router.push({ pathname: "/(auth)/otp", params: { email } });
  }

  async function googleLogin() {
    await oauthFlow.login({ provider: "google", redirectPath: "/(app)/home" });
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-10">Welcome to SpiceUP</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        className="bg-neutral-900 text-white p-4 rounded-xl mb-3"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable onPress={sendOtp} className="bg-accent p-4 rounded-xl mb-4">
        <Text className="text-white text-center font-semibold">Continue with Email</Text>
      </Pressable>

      <Pressable onPress={googleLogin} className="bg-white p-4 rounded-xl">
        <Text className="text-black text-center font-semibold">Continue with Google</Text>
      </Pressable>
    </View>
  );
}
```

### 8.14 `app/(auth)/otp.tsx`
```tsx
import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLoginWithEmail } from "@privy-io/expo";

export default function Otp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const { loginWithCode, state } = useLoginWithEmail();

  async function verify() {
    const user = await loginWithCode({ code, email });
    if (user) router.replace("/(auth)/phone");
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-white text-2xl font-bold mb-4">Enter the code</Text>
      <Text className="text-neutral-400 mb-8">Sent to {email}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="6-digit code"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        maxLength={6}
        className="bg-neutral-900 text-white p-4 rounded-xl mb-4 text-center text-xl tracking-widest"
      />
      <Pressable onPress={verify} className="bg-accent p-4 rounded-xl">
        <Text className="text-white text-center font-semibold">
          {state.status === "submitting-code" ? "Verifying…" : "Verify"}
        </Text>
      </Pressable>
    </View>
  );
}
```

### 8.15 `app/(auth)/phone.tsx`
```tsx
// Simple local-only phone capture. SMS OTP + Supabase resolver is deferred to Cat 5.
import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { secureSet } from "@/lib/secure";

export default function Phone() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  async function save() {
    if (phone.length < 6) return;
    await secureSet("phoneNumber", phone);
    router.replace("/(app)/home");
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-white text-2xl font-bold mb-2">Your phone number</Text>
      <Text className="text-neutral-400 mb-8">
        Friends use your phone number to find you.
      </Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="+1 555 555 5555"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        className="bg-neutral-900 text-white p-4 rounded-xl mb-4"
      />
      <Pressable onPress={save} className="bg-accent p-4 rounded-xl">
        <Text className="text-white text-center font-semibold">Continue</Text>
      </Pressable>
    </View>
  );
}
```

### 8.16 `app/(auth)/onboard.tsx` (simple)
```tsx
// Minimal 3-slide explainer. Not polished — Cat 7 will redesign.
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const slides = [
  { title: "Send money privately", body: "Amounts are hidden on-chain via ZK proofs." },
  { title: "No gas fees, ever", body: "We cover the chain costs for you." },
  { title: "No seed phrases", body: "Sign in with Google or email. That's it." },
];

export default function Onboard() {
  const router = useRouter();
  const { width } = Dimensions.get("window");
  return (
    <View className="flex-1 bg-background">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {slides.map((s, i) => (
          <View key={i} style={{ width }} className="justify-center items-center px-8">
            <Text className="text-white text-3xl font-bold mb-4 text-center">{s.title}</Text>
            <Text className="text-neutral-400 text-center">{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <Pressable onPress={() => router.replace("/(auth)/login")} className="bg-accent mx-6 mb-12 p-4 rounded-xl">
        <Text className="text-white text-center font-semibold">Get Started</Text>
      </Pressable>
    </View>
  );
}
```

### 8.17 `app/(app)/_layout.tsx`
```tsx
import { Stack } from "expo-router";
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 8.18 `app/(app)/home.tsx`
```tsx
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";

export default function Home() {
  const router = useRouter();
  const { status, starknetAddress, tongoRecipientId, error } = useAuthStore();

  if (status !== "ready") {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator color="#7B5EA7" />
        <Text className="text-neutral-400 mt-4">
          {status === "error" ? error : "Setting up your wallet…"}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 pt-20">
      <Text className="text-white text-2xl font-bold mb-8">SpiceUP</Text>

      <View className="bg-neutral-900 p-4 rounded-xl mb-3">
        <Text className="text-neutral-400 text-xs mb-1">Starknet address</Text>
        <Text className="text-white" numberOfLines={1}>{starknetAddress}</Text>
      </View>

      <View className="bg-neutral-900 p-4 rounded-xl mb-8">
        <Text className="text-neutral-400 text-xs mb-1">Private address (Tongo)</Text>
        <Text className="text-white" numberOfLines={1}>{tongoRecipientId}</Text>
      </View>

      <Pressable onPress={() => router.push("/(app)/settings")} className="bg-neutral-800 p-4 rounded-xl">
        <Text className="text-white text-center">Settings</Text>
      </Pressable>
    </View>
  );
}
```

### 8.19 `app/(app)/settings.tsx`
```tsx
import { View, Text, Pressable } from "react-native";
import { usePrivy } from "@privy-io/expo";
import { useAuthStore } from "@/stores/auth";
import { secureGet } from "@/lib/secure";
import { useState } from "react";

export default function Settings() {
  const { logout } = usePrivy();
  const reset = useAuthStore((s) => s.reset);
  const { starknetAddress, tongoRecipientId } = useAuthStore();
  const [key, setKey] = useState<string | null>(null);

  async function exportKey() {
    const k = await secureGet("tongoPrivateKey");
    setKey(k);
  }

  async function doLogout() {
    await logout();
    reset();
  }

  return (
    <View className="flex-1 bg-background px-6 pt-20">
      <Text className="text-white text-2xl font-bold mb-6">Settings</Text>

      <Text className="text-neutral-400 mb-1">Starknet</Text>
      <Text className="text-white mb-4" numberOfLines={1}>{starknetAddress}</Text>

      <Text className="text-neutral-400 mb-1">Tongo recipient</Text>
      <Text className="text-white mb-6" numberOfLines={1}>{tongoRecipientId}</Text>

      <Pressable onPress={exportKey} className="bg-neutral-800 p-4 rounded-xl mb-3">
        <Text className="text-white text-center">Export Tongo private key</Text>
      </Pressable>
      {key && <Text className="text-yellow-400 text-xs mb-3">{key}</Text>}

      <Pressable onPress={doLogout} className="bg-red-900 p-4 rounded-xl">
        <Text className="text-white text-center">Log out</Text>
      </Pressable>
    </View>
  );
}
```

### 8.20 `.env` (UPDATE)
Add real Privy App ID (user provides). Keep other keys as-is for now.
```
EXPO_PUBLIC_NETWORK=sepolia
EXPO_PUBLIC_PRIVY_APP_ID=<paste-from-privy-dashboard>
EXPO_PUBLIC_PRIVY_CLIENT_ID=
EXPO_PUBLIC_AVNU_API_KEY=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### 8.21 `.env.example` (UPDATE)
Mirror the above with placeholder values.

---

## 9. Verification Checklist

Run in order — all must pass:

### 9.1 Static checks
```bash
node -e "console.log(require.resolve('starkzap'))"
# Must be inside node_modules/starkzap/dist/

npx tsc --noEmit
# 0 errors

npx expo-doctor
# 17/17 checks pass
```

### 9.2 Cold-start flow (web)
```bash
npx expo start --clear
# press 'w'
```
Manual steps:
- [ ] Browser opens → redirects to `/(auth)/login`
- [ ] Enter email → "Continue with Email" → `/(auth)/otp`
- [ ] Paste code from Privy test mode → lands on `/(auth)/phone`
- [ ] Enter phone → Continue → `/(app)/home`
- [ ] Home shows a non-empty Starknet address + Tongo recipient ID
- [ ] Open Settings → "Export Tongo private key" shows a 0x-prefixed hex string
- [ ] Reload page → auto-lands back on home (not login) with same addresses

### 9.3 Persistence
- [ ] Clear SecureStore: `await SecureStore.deleteItemAsync("spiceup.tongo.privateKey")` — next login should generate a new key and different recipient ID
- [ ] Log out → Settings button grays, routed to login

### 9.4 Google OAuth (optional, requires configured redirect)
- [ ] Click "Continue with Google" → OAuth browser opens → returns to app authenticated

### 9.5 Done criteria
- [ ] All files from Section 6 exist and compile
- [ ] Zero TypeScript errors
- [ ] Email login flow works end-to-end on web
- [ ] Tongo key persists across reloads
- [ ] Settings shows both addresses
- [ ] Logout clears state + routes back to login

---

## 10. Pitfalls & Iteration Tips

### Pitfalls
1. **`starkzap` symlink** (Section 3). If you skip the fix, every `import from "starkzap"` silently resolves to `SpiceUP/index.ts` and Tongo will be undefined at runtime. Fix must be the first step.
2. **Privy Starknet chain config** — `PrivyProvider`'s `supportedChains` expects specific chain objects. Check `@privy-io/expo/chains` or `extended-chains` submodule for the Starknet chain literal before guessing.
3. **OnboardStrategy literal** — PRD says `OnboardStrategy.Privy` but the real export might be `"privy"` (string) or a const enum. Read `node_modules/starkzap/dist/types/onboard.d.ts` first.
4. **Privy signer interface vs Starkzap expectation** — the adapter in `lib/privy-signer.ts` is a best-guess. Starkzap may expect `signMessage(typed_data)` not `signHash`. During implementation, mirror whatever Starkzap's `PrivyStrategy` declares.
5. **Expo Go vs dev build** — Privy's native extensions and `react-native-webview` likely require a dev client (`npx expo prebuild` + EAS dev build) for mobile. Web should still work in Expo's dev server. Test on web first.
6. **OAuth redirect URIs** — Google login in the browser needs both `http://localhost:8081` (dev) and `spiceup://login-callback` (mobile) whitelisted in the Privy dashboard.
7. **Zustand store instance identity** — do not create more than one store; always import `useAuthStore` from the same file.
8. **`router.replace` inside effect** — can cause infinite loops if the dependencies are wrong. Gate on `isReady` and `user?.id` only.
9. **`require('starkzap')` may bundle server-only code** — If metro errors with "can't resolve fs/node:crypto", check if the core `starkzap` package has a React Native entry in its `exports` field. May need to add a Metro resolver override.

### Iteration Tools
| Tool | Use |
|---|---|
| `npx tsc --noEmit --watch` | Live type checking while writing adapters |
| `node -e "console.log(Object.keys(require('starkzap')))"` | Print actual SDK exports to confirm API names |
| Privy dashboard (Test Mode) | View pending emails + auto-fill OTP codes — essential for email flow testing |
| `npx expo start --clear --web` | Skip mobile bundling, iterate faster |
| React Devtools via Chrome | Inspect Zustand state live |

---

## 11. Risks & Open Unknowns

| Risk | Impact | Mitigation |
|---|---|---|
| `starkzap` package has broken `file:../..` dep | **Critical** — blocks everything | Fix first (Section 3), fallback: install from git URL or contact author |
| Privy + Starkzap `OnboardStrategy.Privy` API mismatch | **High** — core to Cat 2 | Read real `.d.ts` before writing adapter; build minimal signer shim; test with `sdk.onboard` return value logged |
| Privy Expo requires EAS dev client for mobile | Medium | Test on web first; defer mobile until Cat 8 if needed |
| Tongo contract not deployed on Sepolia / unknown address | Medium | Placeholder `0x0` now; fill from Tongo docs or Starknet Discord before Cat 4 |
| Privy OAuth scheme conflicts with Expo dev URL | Low-Medium | Use email OTP as primary testing path; Google OAuth as stretch |
| `expo-secure-store` on web is AsyncStorage-backed | Low | Acceptable — web is for dev only; production targets are iOS/Android |
| `react-native-passkeys` native module | Low | Privy loads it lazily; should not crash if unused |

---

## 12. What's NOT in Category 2

Deferred to later categories:
- Real **balance fetching** (`wallet.getBalance`) → Cat 3
- **Token constants** finalized + `Amount` helpers → Cat 3
- **Transaction history** storage → Cat 3
- **Actual confidential send / receive** → Cat 4
- **QR code display** for receive screen → Cat 3 (hooks can render qrcode-svg already)
- **Phone number SMS verification** via Supabase/Twilio → Cat 5
- **Contact resolver** (phone → Starknet/Tongo address) → Cat 5
- **AVNU Propulsion real API key** → Cat 8 (grant application)
- **Polished onboarding slides** → Cat 7
- **Custom Privy branding / theming** → Cat 7
- **iOS/Android dev build** → Cat 8

Cat 2 is done when: a user can log in (email OTP), the app creates a Starknet wallet via Privy, generates + stores a Tongo key, and lands on a home screen that shows both addresses. No balances, no sends, no groups yet.
