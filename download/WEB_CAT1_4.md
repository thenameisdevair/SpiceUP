# SpiceUP Web — Categories 1–4 (Next.js 15)

> Combined web translation of Categories 1–4. All React Native / Expo code replaced with Next.js 15 App Router + React web equivalents. Starknet SDK integration patterns are unchanged.

---

# Category 1 — Foundation & Infrastructure (Web)

> **Goal**: A scaffolded Next.js 15 project that boots to a blank page with zero TypeScript errors, Tailwind CSS 4 configured, path aliases wired, and all SDKs pre-installed.

---

## Context

- This category has **no business logic** — it's purely "make the project boot".
- Every dependency from Categories 2–4 gets installed here so later categories don't touch infrastructure.

---

## 1. What We're Building (Deliverables)

A working Next.js 15 TypeScript project with:

1. **Project scaffold** — Next.js 15 with App Router, TypeScript strict mode
2. **All SDK dependencies installed** — starkzap (web), @privy-io/react-auth, Supabase
3. **Tailwind CSS 4** — configured with custom theme colors
4. **TypeScript config** — strict mode + `@/` path aliases
5. **Directory structure** — `app/`, `components/`, `lib/`, `hooks/`, `stores/`, `constants/`
6. **Environment scaffolding** — `.env.local`, `.env.example`, `.gitignore`
7. **No polyfills needed** — web browsers have native Buffer, TextEncoder, crypto
8. **No metro.config.js or babel.config.js needed** — Next.js handles everything
9. **Placeholder root page** — blank page proving the dev server works end-to-end

Success = `npm run dev` boots, browser opens to blank screen, `npx tsc --noEmit` passes with 0 errors.

---

## 2. Tools Needed (Outside the Repo)

| Tool | Purpose | How to Get |
|---|---|---|
| Node.js 22 (LTS) | JS runtime | Already installed |
| Git | Version control | Already installed |
| A browser (Chrome/Firefox) | Test via `npm run dev` | Already available |

---

## 3. Package Dependencies (Grouped by Purpose)

### 3.1 Core framework (provided by `create-next-app`)
- `next@^15` — Next.js framework
- `react`, `react-dom`
- `typescript`, `@types/react`, `@types/node`

### 3.2 Styling
- `tailwindcss@^4` — Tailwind CSS v4 (built into Next.js 15)
- `@tailwindcss/postcss` — PostCSS plugin for Tailwind v4

### 3.3 Starkzap SDK
- `starkzap` — the web-compatible build of Starkzap v2 (drags in `@avnu/avnu-sdk` and `starknet`)

### 3.4 Auth — Privy for React web
- `@privy-io/react-auth` — Privy React auth provider

### 3.5 State + backend
- `zustand` — state management (unchanged from mobile)
- `@supabase/supabase-js` — backend client (unchanged from mobile)

### 3.6 QR codes
- `qrcode.react` — QR rendering for receive screen (replaces `react-native-qrcode-svg`)

### 3.7 Icons
- `lucide-react` — icon set (replaces `@expo/vector-icons`)

### 3.8 Animations
- `framer-motion` — animations (replaces `react-native-reanimated`)

### 3.9 QR Scanning
- `html5-qrcode` — browser-based QR scanner (replaces `expo-camera` / `expo-barcode-scanner`)

---

## 4. Step-by-Step Build Sequence

### Step 4.1 — Scaffold the Next.js project
```bash
npx create-next-app@latest spiceup-web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

Creates: `next.config.ts`, `tsconfig.json`, `package.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/` directory.

### Step 4.2 — Install Starkzap + SDK deps
```bash
npm install starkzap@2.0.0
```

### Step 4.3 — Install auth, state, backend
```bash
npm install @privy-io/react-auth zustand @supabase/supabase-js
```

### Step 4.4 — Install UI deps
```bash
npm install qrcode.react lucide-react framer-motion html5-qrcode
```

### Step 4.5 — Create directory structure
```bash
mkdir -p app/\(auth\) app/\(app\) components lib hooks stores constants
```

### Step 4.6 — Write/edit config files
(see Section 5 below for exact content)

### Step 4.7 — Create placeholder pages
1. `app/layout.tsx` — root layout with html/body, font import
2. `app/page.tsx` — redirect splash
3. `app/(auth)/login/page.tsx` — blank placeholder
4. `app/(app)/home/page.tsx` — blank placeholder

### Step 4.8 — Verify
```bash
npx tsc --noEmit
npm run dev
# Open http://localhost:3000
```

---

## 5. Config File Contents (Exact)

### 5.1 `next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Starkzap may use Node.js crypto — polyfill only if needed
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

### 5.2 `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["./lib/*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/stores/*": ["./stores/*"],
      "@/constants/*": ["./constants/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5.3 `app/globals.css` (Tailwind CSS v4)
```css
@import "tailwindcss";

@theme {
  --color-background: #0D0D0D;
  --color-accent: #7B5EA7;
  --color-success: #4CAF50;
}
```

### 5.4 `app/layout.tsx` (placeholder — will be replaced in Cat 2)
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpiceUP",
  description: "Private payments on Starknet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### 5.5 `app/page.tsx` (placeholder)
```tsx
export default function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-white text-xl">SpiceUP</h1>
    </div>
  );
}
```

### 5.6 `.env.local` (new, gitignored)
```
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_AVNU_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 5.7 `.env.example` (new, committed)
Same keys, placeholder values like `your_privy_app_id_here`.

### 5.8 `.gitignore` (append if not present)
```
.env.local
.env*.local
.next/
```

---

## 6. Final Directory Structure (After Category 1)

```
spiceup-web/
├── app/
│   ├── layout.tsx            ← placeholder root layout
│   ├── page.tsx              ← placeholder splash
│   ├── globals.css           ← Tailwind CSS v4
│   ├── (auth)/               ← empty, ready for Cat 2
│   │   └── login/
│   │       └── page.tsx
│   └── (app)/                ← empty, ready for Cat 2
│       └── home/
│           └── page.tsx
├── components/               ← empty, ready for Cat 3
├── constants/                ← empty, ready for Cat 3
├── hooks/                    ← empty, ready for Cat 3
├── lib/                      ← empty, ready for Cat 3
├── stores/                   ← empty, ready for Cat 2
├── .env.local                ← gitignored
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 7. Verification Checklist

```bash
# 1. TypeScript strict check
npx tsc --noEmit
# Expect: 0 errors

# 2. Dev server boot
npm run dev
# Open http://localhost:3000
# Expect: blank dark screen with "SpiceUP" text, no runtime errors
```

**Done criteria checklist**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run dev` boots without errors
- [ ] Browser shows blank dark screen with "SpiceUP"
- [ ] `starkzap` module imports without runtime errors

---

## 8. Common Pitfalls & Iteration Tips

### Pitfalls
1. **No polyfills needed** — Browsers have native `crypto.getRandomValues`, `TextEncoder`, `Buffer` (via `buffer` package if needed). No `index.ts` polyfill file required.
2. **No metro.config.js / babel.config.js** — Next.js uses its own bundler (Turbopack or webpack). These files are unnecessary.
3. **starkzap web compatibility** — The `starkzap` npm package should work directly in webpack. If it has Node.js-only deps (fs, net, child_process), use `webpack.resolve.fallback` in `next.config.ts` to suppress them (already configured above).
4. **Tailwind CSS v4** — Uses `@import "tailwindcss"` and `@theme {}` block instead of `tailwind.config.js`. No `content` array needed — v4 auto-detects files.
5. **Path aliases** — Next.js resolves `@/*` at both build and type-check time. No extra module resolver needed.

### Iteration Tools
| Tool | Use |
|---|---|
| `npm run dev` | Start dev server (Turbopack by default in Next.js 15) |
| `npx tsc --noEmit --watch` | Live type checking |
| `npm run build` | Production build to catch all issues |
| `npm ls <package>` | Verify package is installed |

---

# Category 2 — Auth & Identity (Web)

> **Goal**: Users can sign in with Google or email OTP. On first login, a Starknet wallet is created via Privy's embedded wallet (Starknet chain), a separate Tongo private key is generated and stored in localStorage, and the user lands on a home screen showing their addresses. Returning users skip onboarding and go straight to home.

---

## Context

**Where we're starting**: Cat 1 is complete — Next.js 15 project boots, Tailwind is configured, `app/layout.tsx` is a bare layout, `app/page.tsx` shows a "SpiceUP" placeholder. All runtime deps for auth are in `package.json` (`@privy-io/react-auth`, `starkzap`, `zustand`).

**Where we land**: Unauthenticated users see `/login`. Authenticated users see `/home` with their Starknet address and Tongo recipient ID.

---

## 1. What We're Building (Deliverables)

1. **Privy provider wired into root layout** with email OTP + Google OAuth + Starknet embedded wallets
2. **Auth guard middleware** — Next.js middleware redirects unauthenticated users to `/login`
3. **Auth pages**: `login`, `otp`, `phone`, `onboard`
4. **Authenticated pages**: `/home`, `/settings`
5. **Starkzap SDK initialization** via `lib/starkzap.ts`
6. **Privy → Starkzap signer adapter** — converts Privy's Starknet signer to Starkzap's signer interface
7. **Tongo key management** via `lib/tongo.ts` (generate, persist in localStorage, init TongoConfidential)
8. **Zustand auth store** (`stores/auth.ts`)
9. **Network config module** (`constants/network.ts`)
10. **Typed env loader** (`lib/env.ts`)

---

## 2. Package Dependencies

```bash
# All already installed in Cat 1, verify:
npm ls @privy-io/react-auth starkzap zustand
```

---

## 3. Directory Structure

```
spiceup-web/
├── app/
│   ├── layout.tsx                  ← REPLACE: add PrivyProvider
│   ├── page.tsx                    ← REPLACE: redirect splash
│   ├── middleware.ts               ← NEW: auth guard
│   ├── (auth)/
│   │   ├── login/page.tsx          ← NEW: Email + Google buttons
│   │   ├── otp/page.tsx            ← NEW: 6-digit OTP entry
│   │   ├── phone/page.tsx          ← NEW: phone number collection
│   │   └── onboard/page.tsx        ← NEW: 3-slide intro
│   └── (app)/
│       ├── layout.tsx              ← NEW: authenticated layout shell
│       ├── home/page.tsx           ← NEW: shows addresses
│       └── settings/page.tsx       ← NEW: address display, logout
├── lib/
│   ├── env.ts                      ← NEW: typed env access
│   ├── storage.ts                  ← NEW: localStorage wrapper
│   ├── starkzap.ts                 ← NEW: SDK singleton + initWallet()
│   ├── tongo.ts                    ← NEW: Tongo key gen/load + initTongo()
│   └── privy-signer.ts             ← NEW: Privy → Starkzap signer adapter
├── hooks/
│   ├── useAuthInit.ts              ← NEW: orchestrates post-login setup
│   └── useAuthGuard.ts             ← NEW: guards routes based on auth state
├── stores/
│   └── auth.ts                     ← NEW: Zustand auth store
└── constants/
    └── network.ts                  ← NEW: per-network RPC, chainId, contracts
```

---

## 4. File Contents (Exact or Skeletons)

### 4.1 `lib/env.ts`
```ts
const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

export const ENV = {
  NETWORK: (process.env.NEXT_PUBLIC_NETWORK ?? "sepolia") as "sepolia" | "mainnet",
  PRIVY_APP_ID: required("NEXT_PUBLIC_PRIVY_APP_ID", process.env.NEXT_PUBLIC_PRIVY_APP_ID),
  AVNU_API_KEY: process.env.NEXT_PUBLIC_AVNU_API_KEY ?? "",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
```

### 4.2 `lib/storage.ts`
```ts
// localStorage wrapper — replaces expo-secure-store for web.
// Keys are namespaced under "spiceup." to avoid collisions.

const NAMESPACE = "spiceup.";

export const STORAGE_KEYS = {
  tongoPrivateKey: `${NAMESPACE}tongo.privateKey`,
  phoneNumber: `${NAMESPACE}user.phone`,
} as const;

export async function storageGet(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

export async function storageDelete(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}
```

### 4.3 `constants/network.ts`
```ts
import { ENV } from "@/lib/env";

type NetworkConfig = {
  name: "sepolia" | "mainnet";
  chainId: string;
  rpcUrl: string;
  tongoContract: string;
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

### 4.4 `lib/starkzap.ts`
```ts
import { StarkZap } from "starkzap";
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
    } as any);
  }
  return sdkInstance;
}

export async function initWallet(privySigner: unknown) {
  const sdk = getSdk();
  const wallet = await sdk.onboard({
    strategy: "privy",
    signer: privySigner,
    deploy: "if_needed",
  } as any);
  return wallet;
}
```

### 4.5 `lib/privy-signer.ts`
```ts
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

### 4.6 `lib/tongo.ts`
```ts
import { TongoConfidential } from "starkzap";
import { provider } from "@/lib/starkzap";
import { NETWORK } from "@/constants/network";
import { storageGet, storageSet, STORAGE_KEYS } from "@/lib/storage";

// 32-byte random hex, suitable as a Tongo private key.
export async function generateTongoPrivateKey(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateTongoKey(): Promise<string> {
  const existing = await storageGet(STORAGE_KEYS.tongoPrivateKey);
  if (existing) return existing;
  const fresh = await generateTongoPrivateKey();
  await storageSet(STORAGE_KEYS.tongoPrivateKey, fresh);
  return fresh;
}

export function initTongo(privateKey: string): TongoConfidential {
  return new TongoConfidential(privateKey, NETWORK.tongoContract, provider);
}
```

### 4.7 `stores/auth.ts`
```ts
import { create } from "zustand";

type Status = "idle" | "initializing" | "ready" | "error";

interface AuthState {
  status: Status;
  error: string | null;
  privyUserId: string | null;
  starknetAddress: string | null;
  tongoRecipientId: string | null;
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

### 4.8 `hooks/useAuthInit.ts`
```ts
"use client";

import { useEffect } from "react";
import { usePrivy, useCreateWallet, useSignRawHash } from "@privy-io/react-auth";
import { initWallet } from "@/lib/starkzap";
import { createPrivyStarknetSigner } from "@/lib/privy-signer";
import { getOrCreateTongoKey, initTongo } from "@/lib/tongo";
import { useAuthStore } from "@/stores/auth";

export function useAuthInit() {
  const { ready, user, authenticated } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const store = useAuthStore();

  useEffect(() => {
    if (!ready || !authenticated || !user || store.status !== "idle") return;
    (async () => {
      try {
        store.setStatus("initializing");

        // 1. Find or create Starknet wallet via Privy
        const starknetAcct = user.linkedAccounts?.find(
          (a: any) => a.chainType === "starknet" || a.type === "starknet_wallet"
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
  }, [ready, authenticated, user?.id]);
}
```

### 4.9 `app/middleware.ts`
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth guard at the edge.
// Privy manages its own cookie — we check for the privy-token cookie.
const PUBLIC_PATHS = ["/login", "/otp", "/phone", "/onboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrivyToken = request.cookies.has("privy-token");

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAppPath = pathname.startsWith("/home") || pathname.startsWith("/settings")
    || pathname.startsWith("/send") || pathname.startsWith("/receive")
    || pathname.startsWith("/fund") || pathname.startsWith("/withdraw");

  if (!hasPrivyToken && isAppPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasPrivyToken && isPublicPath) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|globals.css).*)"],
};
```

### 4.10 `app/layout.tsx` (REPLACE)
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PrivyProvider } from "@privy-io/react-auth";
import { ENV } from "@/lib/env";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpiceUP",
  description: "Private payments on Starknet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-white antialiased`}>
        <PrivyProvider
          appId={ENV.PRIVY_APP_ID}
          config={{
            supportedChains: [
              // Starknet Sepolia + Mainnet chain objects from @privy-io/react-auth/chains
            ],
            defaultChain: undefined, // set after confirming Privy starknet chain config
          }}
        >
          <AuthGate>{children}</AuthGate>
        </PrivyProvider>
      </body>
    </html>
  );
}
```

### 4.11 `components/AuthGate.tsx` (NEW)
```tsx
"use client";

import { useAuthInit } from "@/hooks/useAuthInit";

export function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthInit();
  return <>{children}</>;
}
```

### 4.12 `app/page.tsx` (REPLACE)
```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Splash() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (authenticated) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}
```

### 4.13 `app/(auth)/login/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginWithEmail, useLoginWithOAuth } from "@privy-io/react-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const { sendCode } = useLoginWithEmail();
  const { login: loginWithGoogle } = useLoginWithOAuth();

  async function handleSendOtp() {
    await sendCode({ email });
    router.push(`/otp?email=${encodeURIComponent(email)}`);
  }

  async function handleGoogleLogin() {
    loginWithGoogle();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-white text-3xl font-bold">Welcome to SpiceUP</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800 focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleSendOtp}
          className="w-full bg-accent hover:bg-accent/90 text-white p-4 rounded-xl font-semibold transition-colors"
        >
          Continue with Email
        </button>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-neutral-200 text-black p-4 rounded-xl font-semibold transition-colors"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
```

### 4.14 `app/(auth)/otp/page.tsx`
```tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLoginWithEmail } from "@privy-io/react-auth";

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const { loginWithCode, state } = useLoginWithEmail();

  async function verify() {
    try {
      await loginWithCode({ code, email });
      router.replace("/phone");
    } catch {
      // Privy shows error via state
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-white text-2xl font-bold">Enter the code</h2>
        <p className="text-neutral-400">Sent to {email}</p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          maxLength={6}
          className="w-full bg-neutral-900 text-white p-4 rounded-xl text-center text-xl tracking-widest border border-neutral-800 focus:border-accent focus:outline-none"
        />
        <button
          onClick={verify}
          className="w-full bg-accent hover:bg-accent/90 text-white p-4 rounded-xl font-semibold transition-colors"
        >
          {state.status === "submitting-code" ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>}>
      <OtpForm />
    </Suspense>
  );
}
```

### 4.15 `app/(auth)/phone/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { storageSet, STORAGE_KEYS } from "@/lib/storage";

export default function PhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  async function save() {
    if (phone.length < 6) return;
    await storageSet(STORAGE_KEYS.phoneNumber, phone);
    router.replace("/home");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-white text-2xl font-bold">Your phone number</h2>
        <p className="text-neutral-400">Friends use your phone number to find you.</p>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 555 5555"
          className="w-full bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800 focus:border-accent focus:outline-none"
        />
        <button
          onClick={save}
          className="w-full bg-accent hover:bg-accent/90 text-white p-4 rounded-xl font-semibold transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

### 4.16 `app/(auth)/onboard/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  { title: "Send money privately", body: "Amounts are hidden on-chain via ZK proofs." },
  { title: "No gas fees, ever", body: "We cover the chain costs for you." },
  { title: "No seed phrases", body: "Sign in with Google or email. That's it." },
];

export default function OnboardPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          className="text-center mb-12"
        >
          <h2 className="text-white text-3xl font-bold mb-4">{slides[current].title}</h2>
          <p className="text-neutral-400">{slides[current].body}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-accent" : "w-2 bg-neutral-700"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => current < slides.length - 1 ? setCurrent(current + 1) : router.replace("/login")}
        className="bg-accent hover:bg-accent/90 text-white px-12 p-4 rounded-xl font-semibold transition-colors"
      >
        {current < slides.length - 1 ? "Next" : "Get Started"}
      </button>
    </div>
  );
}
```

### 4.17 `app/(app)/layout.tsx`
```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### 4.18 `app/(app)/home/page.tsx`
```tsx
"use client";

import { useAuthStore } from "@/stores/auth";

export default function HomePage() {
  const { status, starknetAddress, tongoRecipientId, error } = useAuthStore();

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div>
          <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-neutral-400 text-center">
            {status === "error" ? error : "Setting up your wallet..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-20">
      <h1 className="text-white text-2xl font-bold mb-8">SpiceUP</h1>

      <div className="bg-neutral-900 p-4 rounded-xl mb-3">
        <p className="text-neutral-400 text-xs mb-1">Starknet address</p>
        <p className="text-white truncate">{starknetAddress}</p>
      </div>

      <div className="bg-neutral-900 p-4 rounded-xl mb-8">
        <p className="text-neutral-400 text-xs mb-1">Private address (Tongo)</p>
        <p className="text-white truncate">{tongoRecipientId}</p>
      </div>

      <a
        href="/settings"
        className="block bg-neutral-800 hover:bg-neutral-700 p-4 rounded-xl text-center text-white transition-colors"
      >
        Settings
      </a>
    </div>
  );
}
```

### 4.19 `app/(app)/settings/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthStore } from "@/stores/auth";
import { storageGet, STORAGE_KEYS } from "@/lib/storage";

export default function SettingsPage() {
  const { logout } = usePrivy();
  const reset = useAuthStore((s) => s.reset);
  const { starknetAddress, tongoRecipientId } = useAuthStore();
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);

  async function exportKey() {
    const k = await storageGet(STORAGE_KEYS.tongoPrivateKey);
    setKey(k);
  }

  async function doLogout() {
    await logout();
    reset();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-20">
      <h1 className="text-white text-2xl font-bold mb-6">Settings</h1>

      <p className="text-neutral-400 mb-1">Starknet</p>
      <p className="text-white mb-4 truncate">{starknetAddress}</p>

      <p className="text-neutral-400 mb-1">Tongo recipient</p>
      <p className="text-white mb-6 truncate">{tongoRecipientId}</p>

      <button
        onClick={exportKey}
        className="w-full bg-neutral-800 hover:bg-neutral-700 p-4 rounded-xl mb-3 text-white transition-colors"
      >
        Export Tongo private key
      </button>
      {key && <p className="text-yellow-400 text-xs mb-3 break-all">{key}</p>}

      <button
        onClick={doLogout}
        className="w-full bg-red-900 hover:bg-red-800 p-4 rounded-xl text-white transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
```

### 4.20 `.env.local` (UPDATE)
```
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_PRIVY_APP_ID=<paste-from-privy-dashboard>
NEXT_PUBLIC_AVNU_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 5. Verification Checklist

```bash
npx tsc --noEmit
# 0 errors

npm run dev
# Open http://localhost:3000
```

Manual steps:
- [ ] Browser opens → redirects to `/login`
- [ ] Enter email → "Continue with Email" → `/otp`
- [ ] Paste code → lands on `/phone`
- [ ] Enter phone → Continue → `/home`
- [ ] Home shows Starknet address + Tongo recipient ID
- [ ] Settings → "Export Tongo private key" shows a 0x-prefixed hex string
- [ ] Reload page → auto-lands on `/home` with same addresses

---

# Category 3 — Core Wallet Layer (Web)

> **Goal**: Users can see their balances (public + confidential), receive funds via QR code, and perform basic public transfers. The home screen becomes a functional wallet dashboard with real-time balances, transaction history, and quick actions.

---

## Context

**Where we're starting**: Cat 2 is complete. The auth store holds `wallet` and `tongo` instances ready for queries.

**Where we land**: The home screen shows real ETH, STRK, and USDC balances with 15-second polling. Users can toggle between public and private addresses on a receive page with QR codes. A basic send page handles public ERC20 transfers with preflight simulation. Transaction records are cached in localStorage. The app layout uses a bottom tab navigation bar.

---

## 1. What We're Building (Deliverables)

1. **Token constants** (`constants/tokens.ts`)
2. **Balance hook** (`hooks/useBalance.ts`) — polls balances every 15s
3. **Confidential balance hook** (`hooks/useConfidentialBalance.ts`)
4. **Wallet store** (`stores/wallet.ts`)
5. **Transaction history** (`lib/txHistory.ts`) — localStorage-backed
6. **Transaction history hook** (`hooks/useTransactionHistory.ts`)
7. **Receive page** (`app/(app)/receive/page.tsx`) — QR codes via `qrcode.react`
8. **Send page** (`app/(app)/send/page.tsx`) — public ERC20 transfers
9. **Home page redesign** (`app/(app)/home/page.tsx`) — balance dashboard
10. **Tab navigation** (`components/TabBar.tsx`) — Home, Send, Receive, Settings
11. **Amount formatting helpers** (`lib/format.ts`)

---

## 2. Package Dependencies

All dependencies were installed in Cat 1–2:
- `starkzap` — Core SDK
- `qrcode.react` — QR rendering (replaces `react-native-qrcode-svg`)
- `lucide-react` — icons (replaces `@expo/vector-icons`)
- `zustand` — state management

---

## 3. File Contents

### 3.1 `constants/tokens.ts`
```ts
import type { Token, Address } from "starkzap";
import { NETWORK } from "@/constants/network";

export const STRK: Token = {
  name: "Starknet Token",
  address: NETWORK.tokens.STRK as Address,
  decimals: 18,
  symbol: "STRK",
};

export const ETH: Token = {
  name: "Ether",
  address: NETWORK.tokens.ETH as Address,
  decimals: 18,
  symbol: "ETH",
};

export const USDC: Token = {
  name: "USD Coin",
  address: NETWORK.tokens.USDC as Address,
  decimals: 6,
  symbol: "USDC",
};

export const ALL_TOKENS: Token[] = [ETH, STRK, USDC];

export const TOKEN_BY_SYMBOL: Record<string, Token> = { STRK, ETH, USDC };
```

### 3.2 `stores/wallet.ts`
```ts
import { create } from "zustand";
import type { Amount, ConfidentialState } from "starkzap";

interface WalletState {
  balances: {
    ETH: Amount | null;
    STRK: Amount | null;
    USDC: Amount | null;
  };
  confidential: ConfidentialState | null;
  confidentialAvailable: boolean;
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;

  setBalance: (symbol: string, amount: Amount) => void;
  setConfidential: (state: ConfidentialState) => void;
  setConfidentialUnavailable: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markUpdated: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balances: { ETH: null, STRK: null, USDC: null },
  confidential: null,
  confidentialAvailable: true,
  lastUpdated: null,
  loading: false,
  error: null,

  setBalance: (symbol, amount) =>
    set((s) => ({ balances: { ...s.balances, [symbol]: amount } })),
  setConfidential: (state) => set({ confidential: state }),
  setConfidentialUnavailable: () => set({ confidentialAvailable: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  markUpdated: () => set({ lastUpdated: Date.now() }),
}));
```

### 3.3 `lib/format.ts`
```ts
import type { Amount } from "starkzap";

export function formatBalance(amount: Amount | null): string {
  if (!amount) return "—";
  return amount.toFormatted(true);
}

export function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function toFiat(_amount: Amount | null, _token: string): string {
  return "$—";
}
```

### 3.4 `lib/txHistory.ts`
```ts
// localStorage-backed transaction history — replaces AsyncStorage.

const STORAGE_KEY = "spiceup.txHistory";

export interface TxRecord {
  id: string;
  type: "send" | "receive" | "fund" | "withdraw" | "rollover";
  amount: string;
  token: string;
  counterparty: string;
  timestamp: number;
  txHash: string;
  isPrivate: boolean;
}

export function getTxHistory(): TxRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as TxRecord[];
}

export function saveTx(record: TxRecord): void {
  const history = getTxHistory();
  history.unshift(record);
  if (history.length > 200) history.length = 200;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

### 3.5 `hooks/useBalance.ts`
```ts
"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { ALL_TOKENS } from "@/constants/tokens";

const POLL_INTERVAL = 15_000;

export function useBalance() {
  const wallet = useAuthStore((s) => s.wallet);
  const { setBalance, setLoading, setError, markUpdated } = useWalletStore();

  const fetchBalances = useCallback(async () => {
    if (!wallet) return;
    try {
      setLoading(true);
      const results = await Promise.allSettled(
        ALL_TOKENS.map((token) => (wallet as any).balanceOf(token))
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          setBalance(ALL_TOKENS[i].symbol, result.value);
        }
      });
      markUpdated();
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [wallet, setBalance, setLoading, setError, markUpdated]);

  useEffect(() => {
    fetchBalances();
    const id = setInterval(fetchBalances, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBalances]);

  return { refetch: fetchBalances };
}
```

### 3.6 `hooks/useConfidentialBalance.ts`
```ts
"use client";

import { useEffect, useCallback, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { NETWORK } from "@/constants/network";

export function useConfidentialBalance() {
  const tongo = useAuthStore((s) => s.tongo);
  const wallet = useAuthStore((s) => s.wallet);
  const { setConfidential, setConfidentialUnavailable } = useWalletStore();
  const confidential = useWalletStore((s) => s.confidential);
  const [rollingOver, setRollingOver] = useState(false);

  const fetchState = useCallback(async () => {
    if (!tongo) return;
    if (NETWORK.tongoContract === "0x0") {
      setConfidentialUnavailable();
      return;
    }
    try {
      const state = await (tongo as any).getState();
      setConfidential(state);
    } catch (e) {
      console.warn("Failed to fetch confidential state:", e);
    }
  }, [tongo, setConfidential, setConfidentialUnavailable]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 15_000);
    return () => clearInterval(id);
  }, [fetchState]);

  const needsRollover = confidential ? (confidential as any).pending > 0n : false;

  const rollover = useCallback(async () => {
    if (!tongo || !wallet || !confidential || (confidential as any).pending === 0n) return;
    setRollingOver(true);
    try {
      const calls = await (tongo as any).rollover({ sender: (wallet as any).address });
      const tx = await (wallet as any).execute(calls);
      await tx.wait();
      await fetchState();
      return tx;
    } finally {
      setRollingOver(false);
    }
  }, [tongo, wallet, confidential, fetchState]);

  return { refetch: fetchState, needsRollover, rollover, rollingOver };
}
```

### 3.7 `hooks/useTransactionHistory.ts`
```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { getTxHistory, saveTx, type TxRecord } from "@/lib/txHistory";

export function useTransactionHistory() {
  const [history, setHistory] = useState<TxRecord[]>([]);

  const load = useCallback(() => {
    const records = getTxHistory();
    setHistory(records);
  }, []);

  useEffect(() => { load(); }, [load]);

  const recordTx = useCallback((record: TxRecord) => {
    saveTx(record);
    setHistory((prev) => [record, ...prev]);
  }, []);

  return { history, recordTx, refetch: load };
}
```

### 3.8 `components/BalanceCard.tsx`
```tsx
import type { Amount, Token } from "starkzap";
import { formatBalance, toFiat } from "@/lib/format";

interface Props {
  token: Token;
  balance: Amount | null;
}

export function BalanceCard({ token, balance }: Props) {
  return (
    <div className="bg-neutral-900 p-4 rounded-xl mb-3 flex items-center justify-between">
      <div>
        <p className="text-white font-semibold text-base">{token.symbol}</p>
        <p className="text-neutral-400 text-xs">{token.name}</p>
      </div>
      <div className="text-right">
        <p className="text-white text-base font-medium">{formatBalance(balance)}</p>
        <p className="text-neutral-500 text-xs">{toFiat(balance, token.symbol)}</p>
      </div>
    </div>
  );
}
```

### 3.9 `components/ConfidentialBalanceCard.tsx`
```tsx
import type { ConfidentialState } from "starkzap";

interface Props {
  state: ConfidentialState | null;
  available: boolean;
  needsRollover: boolean;
  rollingOver: boolean;
  onRollover: () => void;
  onFund?: () => void;
  onWithdraw?: () => void;
}

export function ConfidentialBalanceCard({
  state, available, needsRollover, rollingOver, onRollover, onFund, onWithdraw,
}: Props) {
  if (!available) {
    return (
      <div className="bg-neutral-900 p-4 rounded-xl mb-3 border border-neutral-800">
        <p className="text-neutral-500 text-sm">
          Confidential balance unavailable — contract not deployed
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 p-4 rounded-xl mb-3 border border-purple-900/50">
      <div className="flex items-center mb-2">
        <p className="text-white font-semibold text-base">Private Balance</p>
        <span className="bg-purple-900/60 px-2 py-0.5 rounded ml-2 text-purple-300 text-xs">Private</span>
      </div>

      <p className="text-white text-lg font-medium">
        {state ? String((state as any).balance) : "—"}
      </p>

      {(onFund || onWithdraw) && (
        <div className="flex gap-2 mt-3">
          {onFund && (
            <button onClick={onFund} className="flex-1 bg-purple-800 hover:bg-purple-700 p-2.5 rounded-lg text-sm font-medium text-white transition-colors">
              Fund
            </button>
          )}
          {onWithdraw && (
            <button onClick={onWithdraw} className="flex-1 bg-neutral-800 hover:bg-neutral-700 p-2.5 rounded-lg text-sm font-medium text-white transition-colors">
              Withdraw
            </button>
          )}
        </div>
      )}

      {needsRollover && (
        <button
          onClick={onRollover}
          disabled={rollingOver}
          className="mt-3 w-full bg-purple-800 hover:bg-purple-700 disabled:opacity-50 p-3 rounded-lg text-white text-center text-sm font-medium transition-colors"
        >
          {rollingOver ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Activating...
            </span>
          ) : (
            `Activate pending balance (${String((state as any)?.pending ?? 0n)})`
          )}
        </button>
      )}
    </div>
  );
}
```

### 3.10 `components/TransactionItem.tsx`
```tsx
import type { TxRecord } from "@/lib/txHistory";
import { shortenAddress } from "@/lib/format";

interface Props {
  tx: TxRecord;
}

export function TransactionItem({ tx }: Props) {
  const isSend = tx.type === "send" || tx.type === "fund";
  const sign = isSend ? "-" : "+";
  const color = isSend ? "text-red-400" : "text-green-400";

  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-800">
      <div className="flex-1">
        <div className="flex items-center">
          <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
          {tx.isPrivate && (
            <span className="bg-purple-900/60 px-1.5 py-0.5 rounded ml-2 text-purple-300 text-[10px]">Private</span>
          )}
        </div>
        <p className="text-neutral-500 text-xs mt-0.5">{shortenAddress(tx.counterparty)}</p>
      </div>
      <div className="text-right">
        <p className={`${color} text-sm font-medium`}>{sign}{tx.amount} {tx.token}</p>
        <p className="text-neutral-600 text-xs">{new Date(tx.timestamp).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
```

### 3.11 `components/AddressDisplay.tsx`
```tsx
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { shortenAddress } from "@/lib/format";

interface Props {
  label: string;
  address: string;
  full?: boolean;
}

export function AddressDisplay({ label, address, full = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="w-full text-left bg-neutral-900 hover:bg-neutral-800 p-4 rounded-xl transition-colors"
    >
      <p className="text-neutral-400 text-xs mb-1">{label}</p>
      <p className="text-white truncate">{full ? address : shortenAddress(address)}</p>
      <p className="text-neutral-500 text-xs mt-1 flex items-center gap-1">
        {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Tap to copy</>}
      </p>
    </button>
  );
}
```

### 3.12 `components/AmountInput.tsx`
```tsx
import type { Token } from "starkzap";
import { ALL_TOKENS } from "@/constants/tokens";

interface Props {
  value: string;
  onChange: (text: string) => void;
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
}

export function AmountInput({ value, onChange, selectedToken, onSelectToken }: Props) {
  return (
    <div className="flex bg-neutral-900 rounded-xl overflow-hidden">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="flex-1 bg-transparent text-white text-xl p-4 focus:outline-none"
      />
      <div className="flex items-center pr-2 gap-1">
        {ALL_TOKENS.map((token) => (
          <button
            key={token.symbol}
            onClick={() => onSelectToken(token)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedToken.symbol === token.symbol
                ? "bg-accent text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            {token.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 3.13 `components/TabBar.tsx`
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowUpRight, ArrowDownLeft, Settings } from "lucide-react";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/send", label: "Send", icon: ArrowUpRight },
  { href: "/receive", label: "Receive", icon: ArrowDownLeft },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-neutral-800 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 transition-colors ${
                active ? "text-accent" : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 3.14 `app/(app)/receive/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "@/stores/auth";
import { AddressDisplay } from "@/components/AddressDisplay";
import { TabBar } from "@/components/TabBar";

type Mode = "public" | "private";

export default function ReceivePage() {
  const [mode, setMode] = useState<Mode>("public");
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);

  const tongoQrValue = tongoRecipientId
    ? `tongo:${String((tongoRecipientId as any).x)}:${String((tongoRecipientId as any).y)}`
    : "";

  const address = mode === "public" ? starknetAddress ?? "" : tongoQrValue;
  const label = mode === "public" ? "Starknet Address" : "Private Address (Tongo)";

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-24">
      <h1 className="text-white text-2xl font-bold mb-6">Receive</h1>

      <div className="flex bg-neutral-900 rounded-xl p-1 mb-8">
        <button
          onClick={() => setMode("public")}
          className={`flex-1 p-3 rounded-lg text-center font-medium transition-colors ${
            mode === "public" ? "bg-accent text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          Public
        </button>
        <button
          onClick={() => setMode("private")}
          className={`flex-1 p-3 rounded-lg text-center font-medium transition-colors ${
            mode === "private" ? "bg-accent text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          Private
        </button>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-white p-4 rounded-2xl">
          <QRCodeSVG value={address || "empty"} size={200} />
        </div>
      </div>

      <AddressDisplay label={label} address={address} full />

      {mode === "private" && (
        <p className="text-neutral-500 text-xs text-center mt-4">
          Share this address to receive private transfers. Amounts will be hidden on-chain.
        </p>
      )}

      <TabBar />
    </div>
  );
}
```

### 3.15 `app/(app)/send/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { Amount } from "starkzap";
import type { Token, Address } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { AmountInput } from "@/components/AmountInput";
import { TabBar } from "@/components/TabBar";
import { ETH } from "@/constants/tokens";

type Stage = "input" | "reviewing" | "sending" | "done";

export default function SendPage() {
  const wallet = useAuthStore((s) => s.wallet);
  const [recipient, setRecipient] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [error, setError] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!wallet || !recipient || !amountStr) return;
    setError("");
    setStage("reviewing");
    try {
      const amount = Amount.parse(amountStr, token);
      const result = await (wallet as any)
        .tx()
        .transfer(token, { to: recipient as Address, amount })
        .preflight();
      if (!result.ok) {
        setError(result.reason ?? "Unknown error");
        setStage("input");
        return;
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
      setStage("input");
    }
  }

  async function send() {
    if (!wallet || !recipient || !amountStr) return;
    setError("");
    setStage("sending");
    try {
      const amount = Amount.parse(amountStr, token);
      const tx = await (wallet as any)
        .tx()
        .transfer(token, { to: recipient as Address, amount })
        .send();
      setTxHash(tx.hash);
      setExplorerUrl(tx.explorerUrl);
      await tx.wait();

      await recordTx({
        id: tx.hash,
        type: "send",
        amount: amountStr,
        token: token.symbol,
        counterparty: recipient,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: false,
      });

      setStage("done");
    } catch (e: any) {
      setError(e.message ?? String(e));
      setStage("input");
    }
  }

  function reset() {
    setRecipient("");
    setAmountStr("");
    setTxHash("");
    setExplorerUrl("");
    setError("");
    setStage("input");
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-background px-6 flex flex-col items-center justify-center">
        <h2 className="text-green-400 text-2xl font-bold mb-4">Sent!</h2>
        <p className="text-neutral-400 text-sm mb-2">
          {amountStr} {token.symbol} to {recipient.slice(0, 10)}...
        </p>
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 text-xs mb-8 hover:underline truncate max-w-xs">
            {explorerUrl}
          </a>
        )}
        <button onClick={reset} className="bg-accent hover:bg-accent/90 text-white px-12 p-4 rounded-xl font-semibold transition-colors">
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-24">
      <h1 className="text-white text-2xl font-bold mb-6">Send</h1>

      <label className="text-neutral-400 text-sm mb-2 block">Recipient address</label>
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="0x..."
        disabled={stage !== "input"}
        className="w-full bg-neutral-900 text-white p-4 rounded-xl mb-4 border border-neutral-800 focus:border-accent focus:outline-none disabled:opacity-50"
      />

      <label className="text-neutral-400 text-sm mb-2 block">Amount</label>
      <AmountInput value={amountStr} onChange={setAmountStr} selectedToken={token} onSelectToken={setToken} />

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-900 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="mt-8">
        {stage === "input" && (
          <button
            onClick={review}
            disabled={!recipient || !amountStr}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 p-4 rounded-xl font-semibold text-white transition-colors"
          >
            Review
          </button>
        )}

        {stage === "reviewing" && (
          <div className="space-y-3">
            <div className="bg-neutral-900 p-4 rounded-xl">
              <p className="text-green-400 text-sm mb-1">Preflight passed</p>
              <p className="text-white">Send {amountStr} {token.symbol} to {recipient.slice(0, 10)}...</p>
            </div>
            <button onClick={send} className="w-full bg-green-700 hover:bg-green-600 p-4 rounded-xl font-semibold text-white transition-colors">
              Confirm &amp; Send
            </button>
            <button onClick={() => setStage("input")} className="w-full p-3 text-neutral-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        )}

        {stage === "sending" && (
          <div className="flex flex-col items-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-neutral-400 mt-2">Sending transaction...</p>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
```

### 3.16 `app/(app)/home/page.tsx` (REPLACE)
```tsx
"use client";

import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useBalance } from "@/hooks/useBalance";
import { useConfidentialBalance } from "@/hooks/useConfidentialBalance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { ALL_TOKENS } from "@/constants/tokens";
import { BalanceCard } from "@/components/BalanceCard";
import { ConfidentialBalanceCard } from "@/components/ConfidentialBalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import { TabBar } from "@/components/TabBar";
import Link from "next/link";

export default function HomePage() {
  const { status, error } = useAuthStore();
  const { balances, confidential, confidentialAvailable, loading } = useWalletStore();
  const { refetch: refetchBalances } = useBalance();
  const { refetch: refetchConfidential, needsRollover, rollover, rollingOver } = useConfidentialBalance();
  const { history } = useTransactionHistory();

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div>
          <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-neutral-400 text-center">{status === "error" ? error : "Setting up your wallet..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-24">
      <h1 className="text-white text-2xl font-bold mb-6">SpiceUP</h1>

      {/* Public balances */}
      {ALL_TOKENS.map((token) => (
        <BalanceCard
          key={token.symbol}
          token={token}
          balance={balances[token.symbol as keyof typeof balances]}
        />
      ))}

      {/* Confidential balance */}
      <ConfidentialBalanceCard
        state={confidential}
        available={confidentialAvailable}
        needsRollover={needsRollover}
        rollingOver={rollingOver}
        onRollover={rollover}
        onFund={() => {}}
        onWithdraw={() => {}}
      />

      {/* Quick actions */}
      <div className="flex gap-2 mt-4 mb-6">
        <Link
          href="/send"
          className="flex-1 bg-accent hover:bg-accent/90 p-4 rounded-xl text-center font-semibold text-white transition-colors"
        >
          Send
        </Link>
        <Link
          href="/receive"
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 p-4 rounded-xl text-center font-semibold text-white transition-colors"
        >
          Receive
        </Link>
      </div>

      {/* Refresh button */}
      <button
        onClick={() => { refetchBalances(); refetchConfidential(); }}
        disabled={loading}
        className="text-accent hover:underline text-sm mb-4 disabled:opacity-50"
      >
        {loading ? "Refreshing..." : "Refresh balances"}
      </button>

      {/* Recent transactions */}
      <h2 className="text-white text-lg font-semibold mb-3">Recent Activity</h2>
      {history.length === 0 ? (
        <p className="text-neutral-500 text-sm">No transactions yet</p>
      ) : (
        history.slice(0, 10).map((tx) => <TransactionItem key={tx.id} tx={tx} />)
      )}

      <TabBar />
    </div>
  );
}
```

---

# Category 4 — Confidential Payments (Tongo) (Web)

> **Goal**: Users can send and receive private transfers where amounts are hidden on-chain via ZK proofs.

---

## Context

- Categories 1–3 are complete: Privy auth works, Starkzap wallet is wired, public balances poll every 15s, Tongo private key is generated and stored in localStorage.
- `TongoConfidential` instance is stored in `useAuthStore.tongo`.

---

## 4.1 Tongo Helper Module (`lib/tongo.ts`) — EXTEND

Add these exports to the existing `lib/tongo.ts`:

```typescript
// QR / address parsing
export function parseTongoQr(input: string): ConfidentialRecipient | null {
  const match = input.match(/^tongo:(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)$/);
  if (!match) return null;
  return { x: BigInt(match[1]), y: BigInt(match[2]) };
}

export function isValidTongoAddress(input: string): boolean {
  return parseTongoQr(input) !== null;
}

// Transaction helpers
export async function fundConfidential(
  onboard: any, tongo: any, amountStr: string, token: Token
): Promise<any> {
  const amount = Amount.parse(amountStr, token);
  const tx = await onboard.tx()
    .confidentialFund(tongo, { amount, sender: onboard.address })
    .send();
  return tx;
}

export async function sendPrivate(
  onboard: any, tongo: any, recipientId: any, amountStr: string, token: Token
): Promise<any> {
  const amount = Amount.parse(amountStr, token);
  const tx = await onboard.tx()
    .confidentialTransfer(tongo, { amount, to: recipientId, sender: onboard.address })
    .send();
  return tx;
}

export async function withdrawConfidential(
  onboard: any, tongo: any, amountStr: string, token: Token, toAddress: string
): Promise<any> {
  const amount = Amount.parse(amountStr, token);
  const tx = await onboard.tx()
    .confidentialWithdraw(tongo, { amount, to: toAddress, sender: onboard.address })
    .send();
  return tx;
}

export async function ragequit(
  onboard: any, tongo: any, toAddress: string
): Promise<any> {
  const calls = await tongo.ragequit({ to: toAddress, sender: onboard.address });
  const tx = await onboard.execute(calls);
  await tx.wait();
  return tx;
}
```

---

## 4.2 Send Flow (Private) — EXTEND `app/(app)/send/page.tsx`

Add a mode toggle at the top:

```tsx
// Add state:
const [mode, setMode] = useState<"public" | "private">("public");
const confidentialAvailable = useWalletStore((s) => s.confidentialAvailable);

// Toggle UI:
<div className="flex bg-neutral-900 rounded-xl p-1 mb-6">
  <button
    onClick={() => { setMode("public"); setRecipient(""); }}
    className={`flex-1 p-3 rounded-lg text-center font-medium transition-colors ${
      mode === "public" ? "bg-accent text-white" : "text-neutral-400"
    }`}
  >
    Public
  </button>
  <button
    onClick={() => { setMode("private"); setRecipient(""); }}
    disabled={!confidentialAvailable}
    className={`flex-1 p-3 rounded-lg text-center font-medium transition-colors disabled:opacity-40 ${
      mode === "private" ? "bg-accent text-white" : "text-neutral-400"
    }`}
  >
    Private
  </button>
</div>

// In private mode, change placeholder:
placeholder="tongo:<x>:<y>"

// Add "Scan" button next to recipient input:
{mode === "private" && (
  <button onClick={openScanner} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent">
    <QrCode size={20} />
  </button>
)}

// "Amount will be hidden" indicator:
{mode === "private" && (
  <div className="mt-4 bg-purple-900/20 border border-purple-900/50 p-3 rounded-xl">
    <p className="text-purple-300 text-sm">Amount will be hidden on-chain via ZK proof</p>
  </div>
)}
```

**QR Scanner** — use `html5-qrcode` in a modal:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerModalProps {
  open: boolean;
  onClose: (value?: string) => void;
}

export function QrScannerModal({ open, onClose }: QrScannerModalProps) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const scanner = new Html5Qrcode("qr-scanner-region");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          onClose(decodedText);
        },
        () => {} // ignore scan failures
      )
      .catch((err) => {
        setError("Camera access denied or unavailable");
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-6">
      <h3 className="text-white text-lg font-semibold mb-4">Scan QR Code</h3>
      <div id="qr-scanner-region" ref={containerRef} className="w-full max-w-sm" />
      {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      <button
        onClick={() => { scannerRef.current?.stop().catch(() => {}); onClose(); }}
        className="mt-6 bg-neutral-800 hover:bg-neutral-700 px-8 p-3 rounded-xl text-white transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
```

**Extended stage machine** for private mode:

```tsx
type Stage = "input" | "reviewing" | "generating_proof" | "sending" | "done";

// In send function (private mode):
if (mode === "private") {
  setStage("generating_proof");
  const parsed = parseTongoQr(recipient);
  if (!parsed) {
    setError("Invalid Tongo address (expected tongo:<x>:<y>)");
    setStage("input");
    return;
  }
  try {
    const tx = await sendPrivate(wallet, tongo, parsed, amountStr, token);
    // ... record and done
  } catch (e) {
    setError(e.message);
    setStage("input");
  }
}
```

**Loading states**:
```tsx
{stage === "generating_proof" && (
  <div className="flex flex-col items-center py-4">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    <p className="text-purple-400 mt-2 font-medium">Generating ZK proof...</p>
    <p className="text-neutral-500 text-xs mt-1">This takes less than a second</p>
  </div>
)}

{stage === "sending" && mode === "private" && (
  <div className="flex flex-col items-center py-4">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    <p className="text-neutral-400 mt-2">Verifying on-chain...</p>
  </div>
)}
```

**Done screen (private)**:
```tsx
{mode === "private" && stage === "done" && (
  <div className="bg-purple-900/20 border border-purple-900/50 px-3 py-1.5 rounded-full text-purple-300 text-xs mb-4">
    Private — amount hidden on-chain
  </div>
)}
```

---

## 4.3 Fund & Withdraw Pages

### `app/(app)/fund/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { fundConfidential } from "@/lib/tongo";
import { AmountInput } from "@/components/AmountInput";
import { TabBar } from "@/components/TabBar";
import { ArrowLeft } from "lucide-react";
import type { Token } from "starkzap";
import { ETH } from "@/constants/tokens";

type Stage = "input" | "reviewing" | "funding" | "done";

export default function FundPage() {
  const router = useRouter();
  const wallet = useAuthStore((s) => s.wallet);
  const tongo = useAuthStore((s) => s.tongo);
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!wallet || !tongo || !amountStr) return;
    setError("");
    setStage("reviewing");
  }

  async function fund() {
    if (!wallet || !tongo || !amountStr) return;
    setError("");
    setStage("funding");
    try {
      const tx = await fundConfidential(wallet, tongo, amountStr, token);
      await tx.wait();
      await recordTx({
        id: tx.hash, type: "fund", amount: amountStr, token: token.symbol,
        counterparty: "self", timestamp: Date.now(), txHash: tx.hash, isPrivate: true,
      });
      setStage("done");
    } catch (e: any) {
      setError(e.message ?? String(e));
      setStage("input");
    }
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-background px-6 flex flex-col items-center justify-center">
        <h2 className="text-green-400 text-2xl font-bold mb-4">Funded!</h2>
        <p className="text-neutral-400 mb-8">{amountStr} {token.symbol} moved to private balance</p>
        <button onClick={() => router.replace("/home")} className="bg-accent hover:bg-accent/90 text-white px-12 p-4 rounded-xl font-semibold transition-colors">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-24">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <h1 className="text-white text-2xl font-bold mb-2">Fund Private Balance</h1>
      <p className="text-neutral-400 mb-8">Move tokens from your public wallet into your private balance</p>

      <label className="text-neutral-400 text-sm mb-2 block">Amount</label>
      <AmountInput value={amountStr} onChange={setAmountStr} selectedToken={token} onSelectToken={setToken} />

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-900 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="mt-8">
        {stage === "input" && (
          <button onClick={review} disabled={!amountStr} className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 p-4 rounded-xl font-semibold text-white transition-colors">
            Review
          </button>
        )}

        {stage === "reviewing" && (
          <div className="space-y-3">
            <div className="bg-neutral-900 p-4 rounded-xl">
              <p className="text-green-400 text-sm mb-1">Ready to fund</p>
              <p className="text-white">Move {amountStr} {token.symbol} to private balance</p>
            </div>
            <button onClick={fund} className="w-full bg-green-700 hover:bg-green-600 p-4 rounded-xl font-semibold text-white transition-colors">
              Confirm
            </button>
            <button onClick={() => setStage("input")} className="w-full p-3 text-neutral-400">Cancel</button>
          </div>
        )}

        {stage === "funding" && (
          <div className="flex flex-col items-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-neutral-400 mt-2">Funding private balance...</p>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
```

### `app/(app)/withdraw/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { withdrawConfidential, ragequit } from "@/lib/tongo";
import { AmountInput } from "@/components/AmountInput";
import { TabBar } from "@/components/TabBar";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import type { Token } from "starkzap";
import { ETH } from "@/constants/tokens";

type Stage = "input" | "reviewing" | "withdrawing" | "done";

export default function WithdrawPage() {
  const router = useRouter();
  const wallet = useAuthStore((s) => s.wallet);
  const tongo = useAuthStore((s) => s.tongo);
  const confidential = useWalletStore((s) => s.confidential);
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState("");
  const { recordTx } = useTransactionHistory();

  async function review() {
    if (!wallet || !tongo || !amountStr) return;
    setError("");
    setStage("reviewing");
  }

  async function withdraw() {
    if (!wallet || !tongo || !amountStr) return;
    setError("");
    setStage("withdrawing");
    try {
      const tx = await withdrawConfidential(wallet, tongo, amountStr, token, (wallet as any).address);
      await tx.wait();
      await recordTx({
        id: tx.hash, type: "withdraw", amount: amountStr, token: token.symbol,
        counterparty: "self", timestamp: Date.now(), txHash: tx.hash, isPrivate: true,
      });
      setStage("done");
    } catch (e: any) {
      setError(e.message ?? String(e));
      setStage("input");
    }
  }

  async function handleRagequit() {
    if (!wallet || !tongo) return;
    if (!confirm("Emergency withdraw: drain entire private balance to your public wallet. Continue?")) return;
    setError("");
    setStage("withdrawing");
    try {
      const tx = await ragequit(wallet, tongo, (wallet as any).address);
      await recordTx({
        id: tx.hash, type: "withdraw", amount: "ALL", token: "CONF",
        counterparty: "self", timestamp: Date.now(), txHash: tx.hash, isPrivate: true,
      });
      setStage("done");
    } catch (e: any) {
      setError(e.message ?? String(e));
      setStage("input");
    }
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-background px-6 flex flex-col items-center justify-center">
        <h2 className="text-green-400 text-2xl font-bold mb-4">Withdrawn!</h2>
        <p className="text-neutral-400 mb-8">{amountStr} {token.symbol} moved to public wallet</p>
        <button onClick={() => router.replace("/home")} className="bg-accent hover:bg-accent/90 text-white px-12 p-4 rounded-xl font-semibold transition-colors">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-24">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <h1 className="text-white text-2xl font-bold mb-2">Withdraw to Public</h1>

      {confidential && (
        <p className="text-neutral-400 mb-8">
          Available: {String((confidential as any).balance)} units
        </p>
      )}

      <label className="text-neutral-400 text-sm mb-2 block">Amount</label>
      <AmountInput value={amountStr} onChange={setAmountStr} selectedToken={token} onSelectToken={setToken} />

      <p className="text-neutral-500 text-xs mt-2">Destination: your public wallet</p>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-900 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="mt-8">
        {stage === "input" && (
          <>
            <button onClick={review} disabled={!amountStr} className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 p-4 rounded-xl font-semibold text-white transition-colors mb-4">
              Review
            </button>

            {/* Ragequit */}
            <button
              onClick={handleRagequit}
              className="w-full bg-red-900/20 border border-red-900 hover:bg-red-900/40 p-4 rounded-xl text-red-400 transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle size={16} />
              Emergency Withdraw All
            </button>
            <p className="text-neutral-500 text-xs text-center mt-1">Drains entire private balance to your public wallet</p>
          </>
        )}

        {stage === "reviewing" && (
          <div className="space-y-3">
            <div className="bg-neutral-900 p-4 rounded-xl">
              <p className="text-green-400 text-sm mb-1">Ready to withdraw</p>
              <p className="text-white">Withdraw {amountStr} {token.symbol} to public wallet</p>
            </div>
            <button onClick={withdraw} className="w-full bg-green-700 hover:bg-green-600 p-4 rounded-xl font-semibold text-white transition-colors">
              Confirm
            </button>
            <button onClick={() => setStage("input")} className="w-full p-3 text-neutral-400">Cancel</button>
          </div>
        )}

        {stage === "withdrawing" && (
          <div className="flex flex-col items-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-neutral-400 mt-2">Withdrawing...</p>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
```

---

## 4.4 Error States Table

| Error | How triggered | Display |
|---|---|---|
| Insufficient balance | Preflight: `result.ok === false` | Red error banner with `result.reason` |
| Invalid recipient address | `parseTongoQr()` returns `null` | Red error: "Enter a valid Tongo address (tongo:<x>:<y>)" |
| Invalid QR scan | `parseTongoQr(data)` returns `null` | Alert: "Not a valid Tongo address QR code" |
| Tx rejected | Any `catch` in send/fund/withdraw | Red error banner with `e.message` |

---

## 5. Files Modified / Created (Summary)

| File | Action | Category |
|---|---|---|
| `lib/tongo.ts` | EXTEND | 4.1 |
| `lib/txHistory.ts` | NEW | 3 |
| `lib/format.ts` | NEW | 3 |
| `lib/storage.ts` | NEW | 2 |
| `lib/env.ts` | NEW | 2 |
| `lib/starkzap.ts` | NEW | 2 |
| `lib/privy-signer.ts` | NEW | 2 |
| `constants/network.ts` | NEW | 2 |
| `constants/tokens.ts` | NEW | 3 |
| `stores/auth.ts` | NEW | 2 |
| `stores/wallet.ts` | NEW | 3 |
| `hooks/useAuthInit.ts` | NEW | 2 |
| `hooks/useBalance.ts` | NEW | 3 |
| `hooks/useConfidentialBalance.ts` | NEW | 3 |
| `hooks/useTransactionHistory.ts` | NEW | 3 |
| `components/AuthGate.tsx` | NEW | 2 |
| `components/TabBar.tsx` | NEW | 3 |
| `components/BalanceCard.tsx` | NEW | 3 |
| `components/ConfidentialBalanceCard.tsx` | NEW | 3 |
| `components/TransactionItem.tsx` | NEW | 3 |
| `components/AddressDisplay.tsx` | NEW | 3 |
| `components/AmountInput.tsx` | NEW | 3 |
| `components/QrScannerModal.tsx` | NEW | 4 |
| `app/layout.tsx` | REPLACE | 2 |
| `app/page.tsx` | REPLACE | 2 |
| `app/middleware.ts` | NEW | 2 |
| `app/(auth)/login/page.tsx` | NEW | 2 |
| `app/(auth)/otp/page.tsx` | NEW | 2 |
| `app/(auth)/phone/page.tsx` | NEW | 2 |
| `app/(auth)/onboard/page.tsx` | NEW | 2 |
| `app/(app)/layout.tsx` | NEW | 2 |
| `app/(app)/home/page.tsx` | NEW | 3 |
| `app/(app)/send/page.tsx` | NEW | 3 + 4 |
| `app/(app)/receive/page.tsx` | NEW | 3 |
| `app/(app)/fund/page.tsx` | NEW | 4 |
| `app/(app)/withdraw/page.tsx` | NEW | 4 |
| `app/(app)/settings/page.tsx` | NEW | 2 |

---

## 6. Mobile → Web Translation Reference

| Mobile (Expo/React Native) | Web (Next.js 15) | Notes |
|---|---|---|
| `expo-router` | Next.js App Router | `app/` directory with `page.tsx` |
| `expo-router` `<Stack>`, `<Tabs>` | Custom `<TabBar>` component | Bottom nav as a client component |
| `NativeWind` / `nativewind` | Tailwind CSS 4 | `@import "tailwindcss"` + `@theme {}` |
| `View`, `Text`, `Pressable` | `<div>`, `<p>`, `<button>` | Standard HTML |
| `TextInput` | `<input>` | Standard HTML |
| `ScrollView` | `<div>` with `overflow-y-auto` | Or native scroll |
| `ActivityIndicator` | CSS `animate-spin` | `<div className="animate-spin ...">` |
| `expo-secure-store` | `localStorage` via `lib/storage.ts` | Not secure, but web standard |
| `AsyncStorage` | `localStorage` via `lib/txHistory.ts` | Synchronous on web |
| `expo-sqlite` | `localStorage` or `idb-keyval` | For groups cache (Cat 5+) |
| `@expo/vector-icons` (Ionicons) | `lucide-react` | `import { Home, ArrowUpRight } from "lucide-react"` |
| `react-native-qrcode-svg` | `qrcode.react` | `import { QRCodeSVG } from "qrcode.react"` |
| `expo-camera` / `expo-barcode-scanner` | `html5-qrcode` | Browser camera API |
| `expo-clipboard` | `navigator.clipboard` | `await navigator.clipboard.writeText(text)` |
| `expo-crypto` getRandomBytes | `crypto.getRandomValues()` | Web Crypto API |
| `expo-font` | `next/font/google` | `const inter = Inter({ subsets: ["latin"] })` |
| `react-native-reanimated` | `framer-motion` | `<motion.div>` |
| `@privy-io/expo` | `@privy-io/react-auth` | Different API surface, same concepts |
| `starkzap-native` | `starkzap` | Same SDK, web-compatible build |
| `useRouter()` from expo-router | `useRouter()` from `next/navigation` | Different API |
| `useLocalSearchParams()` | `useSearchParams()` from `next/navigation` | Must wrap in `<Suspense>` |
| `metro.config.js` | Not needed | Next.js uses webpack/Turbopack |
| `babel.config.js` | Not needed | Next.js handles transpilation |
| `index.ts` polyfills | Not needed | Browsers have native APIs |
| `Alert.alert()` | `window.confirm()` or custom toast/modal | No native alerts on web |
| `EXPO_PUBLIC_*` env vars | `NEXT_PUBLIC_*` env vars | Next.js convention |
| `router.push("/path")` | `router.push("/path")` | Same API from next/navigation |
| `router.replace("/path")` | `router.replace("/path")` | Same API |
| `router.back()` | `router.back()` | Same API |
| `className` (NativeWind) | `className` (Tailwind CSS) | Same prop name |

---

## 7. Verification Checklist (All Categories)

```bash
npx tsc --noEmit
# 0 errors

npm run build
# Production build passes

npm run dev
# Open http://localhost:3000
```

### Cat 1
- [ ] Dev server boots without errors
- [ ] Browser shows blank dark screen with "SpiceUP"

### Cat 2
- [ ] `/login` shows email + Google login
- [ ] Email OTP flow works end-to-end
- [ ] Home shows Starknet address + Tongo recipient ID
- [ ] Session persists across page reloads
- [ ] Logout clears state, redirects to `/login`

### Cat 3
- [ ] Home shows ETH, STRK, USDC balances (polls every 15s)
- [ ] Receive page shows QR codes (public + private toggle)
- [ ] Send page handles public transfers with preflight
- [ ] Tab navigation works (Home, Send, Receive, Settings)
- [ ] Transaction history persists in localStorage
- [ ] Copy address to clipboard works

### Cat 4
- [ ] Send page toggles between public/private mode
- [ ] Private send shows "Generating ZK proof..." then "Verifying on-chain..."
- [ ] QR scanner opens camera and parses Tongo addresses
- [ ] Fund page moves tokens from public to private
- [ ] Withdraw page moves tokens from private to public
- [ ] Ragequit emergency withdrawal works with confirmation
- [ ] "Private" badge on all confidential transactions in history
- [ ] Confidential balance card shows fund/withdraw buttons

---

## 8. What's NOT in Categories 1–4

Deferred to later categories:
- Base58 Tongo address input parsing (→ Category 7)
- Supabase group/expense backend (→ Category 5)
- Yield / staking / DCA flows (→ Category 6)
- Price feed / fiat equivalent (→ Category 6)
- Phone number → Tongo address resolver (→ Category 5)
- Push notifications (→ Category 7)
- Unit tests (→ Category 8)
- Custom Privy branding / theming (→ Category 7)
- Production deployment (→ Category 8)
