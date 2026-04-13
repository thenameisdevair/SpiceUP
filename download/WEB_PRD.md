
# SpiceUP — PRD & Architecture Document (Web)

---

## 1. Product Overview

### What is SpiceUP?
SpiceUP is a privacy-first group payments and remittance web app built on Starknet. It lets users send money privately, split group expenses, and earn yield on idle funds — all without gas fees, seed phrases, or crypto knowledge.

### The Problem
- Existing payment apps (Venmo, PayPal, Western Union) are transparent: amounts are visible to third parties, platforms, and governments.
- Crypto wallets are too complex for mainstream users (seed phrases, gas, addresses).
- Remittance is slow, expensive, and opaque.
- No single app combines privacy + yield + group splitting in a consumer-friendly way.

### The Solution
SpiceUP uses:
- **Tongo** (zero-knowledge confidential transfers) — amounts are hidden on-chain
- **Starkzap v2 SDK** — one SDK for wallets, staking, swaps, DCA, lending, bridging
- **Privy** — social login (email, Google) — no seed phrases for users
- **AVNU Propulsion Paymaster** — all transactions are gasless for the user
- **Starknet** — ZK-native L2 with fast finality and low cost

### Target Users
- **Primary**: Diaspora communities sending remittances home
- **Secondary**: Friend groups splitting expenses (dinner, travel, rent)
- **Tertiary**: Privacy-conscious individuals who want financial confidentiality

### Key Differentiators
1. Hidden amounts — not even the blockchain reveals how much you sent
2. No gas fees ever — AVNU Propulsion covers everything
3. No seed phrases — sign in with Google or email
4. Idle funds earn yield automatically (STRK staking)
5. One app: send, split, earn, bridge

---

## 2. Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web Framework | Next.js 15 (App Router) + TypeScript | SSR/SSG, file-based routing, React Server Components |
| Styling | Tailwind CSS 4 | Utility-first UI styling |
| Blockchain SDK | Starkzap v2 (`starkzap`) | Wallet, transfers, staking, swaps (web build) |
| Privacy Layer | Tongo (`TongoConfidential`) | ZK confidential transfers |
| Auth | Privy (`@privy-io/react-auth`) | Social login, embedded wallets |
| Gasless | AVNU Propulsion Paymaster | Sponsor all user transactions |
| State Management | Zustand | Global app state |
| Local Storage | `localStorage` | Tongo private key + app preferences |
| IndexedDB | `idb-keyval` | Local transaction cache (AsyncStorage replacement) |
| Backend | Supabase (Postgres + Realtime) | Cross-device group/expense sync |
| Network | Starknet Sepolia (primary) + Mainnet (env-switchable) | |
| Chain Config | STRK: `0x04718f5a...`, ETH: `0x049d365...` | Token addresses |
| RPC | `alpha-mainnet.starknet.io` / `alpha-sepolia.starknet.io` | |
| Icons | `lucide-react` | Icon library |
| Animations | `framer-motion` | Page transitions and micro-interactions |
| QR Code Generation | `qrcode.react` | Generate QR codes for addresses |
| QR Code Scanning | `html5-qrcode` | Camera-based QR scanner for addresses |
| Font | Inter via `next/font/google` | Typography |
| Language | TypeScript (strict) | All code |

---

## 3. Development Categories & Subdivisions

---

### CATEGORY 1 — Foundation & Infrastructure

> Goal: A working, runnable Next.js 15 project with all dependencies installed and configured.

#### 1.1 Project Scaffolding
- Initialize Next.js 15 project with TypeScript and App Router template
- Set up directory structure: `app/`, `components/`, `lib/`, `hooks/`, `constants/`, `store/`
- Initialize git repository with `.gitignore`
- Configure `src/` directory option if desired

#### 1.2 Dependency Installation
- `starkzap` — core SDK (web build, no polyfills needed)
- `@privy-io/react-auth` — Privy social login for web
- `zustand` — state management
- `tailwindcss@4` — styling (via Next.js built-in Tailwind v4 support)
- `framer-motion` — animations
- `lucide-react` — icons
- `qrcode.react` — QR code generation
- `html5-qrcode` — camera-based QR scanning
- `idb-keyval` — lightweight IndexedDB wrapper for local cache
- No polyfill packages needed (web-native crypto, Buffer, TextEncoder available natively)

#### 1.3 TypeScript Configuration
- Enable strict mode
- Set up path aliases (`@/lib`, `@/components`, `@/hooks`, `@/constants`, `@/store`)
- Configure `tsconfig.json` for Next.js + ESM compatibility

#### 1.4 Tailwind CSS 4 Configuration
- Tailwind v4 integrated via `@tailwindcss/postcss` in PostCSS config
- CSS-first configuration using `@theme` in global CSS (no `tailwind.config.js` needed)
- Define custom design tokens: colors, fonts, spacing in `app/globals.css`

#### 1.5 Environment Configuration
- Create `.env.local` file for secrets (Privy App ID, AVNU API key, Supabase URL/Anon Key)
- Create `next.config.ts` with any needed external image domains or headers
- Server-side env vars prefixed with `NEXT_PUBLIC_` for client exposure

---

### CATEGORY 2 — Auth & Identity

> Goal: Users can sign in with email or Google. A Starknet wallet is created/restored automatically. Tongo private key is generated and stored securely.

#### 2.1 Privy Integration
- Initialize Privy provider in root `layout.tsx` with App ID
- Configure supported login methods: email (OTP), Google OAuth
- Set up embedded wallet creation on first login (Privy manages the Starknet key)
- Wrap app in `<PrivyProvider>` as a client component

#### 2.2 Starkzap Wallet Initialization
- On login success, call `sdk.onboard()` with `OnboardStrategy.Privy`
- Set `deploy: "if_needed"` so the Starknet account is deployed on first transaction
- Store wallet reference in Zustand store
- Configure paymaster: AVNU Propulsion API key → `feeMode: "sponsored"`

#### 2.3 Tongo Key Management
- On first login, generate a Tongo private key (separate from Starknet key)
- Store it in `localStorage` (encrypted in transit; note: for production, consider a server-side encrypted store or Privy vault)
- On subsequent logins, load from `localStorage`
- Initialize `TongoConfidential` with the key, Tongo contract address (per network), and provider

#### 2.4 Auth Pages
- **Login Page** (`app/(auth)/login/page.tsx`): Social login buttons (Google, Email)
- **OTP Page** (`app/(auth)/otp/page.tsx`): Email OTP verification
- **Phone Page** (`app/(auth)/phone/page.tsx`): Phone number entry + SMS OTP — phone becomes the user's unique identity for the contact resolver
- **Onboarding Page** (`app/(auth)/onboard/page.tsx`): 3-slide intro explaining privacy + gasless UX
- Auth guard in root layout: redirect to login if no session, to app if authenticated

#### 2.5 Profile & Recovery
- Display user's Starknet address (shortened) in settings
- Display Tongo address (base58) as "your private payment address" for receiving
- Export/backup flow for the Tongo key (show as mnemonic or QR)

---

### CATEGORY 3 — Core Wallet Layer

> Goal: Users can see their balances (public + confidential), receive funds, and perform basic public transfers.

#### 3.1 SDK Initialization Module (`lib/starkzap.ts`)
- Export singleton `sdk` (StarkZap instance)
- Export `initWallet(privySigner)` function
- Network driven by `NEXT_PUBLIC_NETWORK` env var: `"sepolia"` (default) or `"mainnet"`
- Both networks fully configured — switching requires only env var change, no code changes
- AVNU paymaster config embedded

#### 3.2 Balance Management
- `wallet.getBalance(ETH)` and `wallet.getBalance(STRK)` — public balances
- `confidential.getState()` — returns `{ balance, pending, nonce }` for private balance
- Rollover pending balance automatically on login if pending > 0
- Expose via `useBalance()` hook with polling (every 15s)

#### 3.3 Token Constants (`constants/tokens.ts`)
- STRK address (mainnet + sepolia)
- ETH address (mainnet + sepolia)
- USDC address (mainnet + sepolia)
- All three tokens supported for both public and confidential transfers
- `Amount.parse()` and `Amount.format()` wrappers

#### 3.4 Receive Flow
- Generate QR code from the user's Starknet address (for public transfers) using `qrcode.react`
- Generate QR code from the user's Tongo `recipientId` (for confidential transfers) using `qrcode.react`
- Toggle between "Public address" and "Private address" on receive page

#### 3.5 Transaction History
- Store transaction records locally in IndexedDB (via `idb-keyval`) since Tongo amounts are hidden on-chain
- Each record: `{ type, amount, counterparty, timestamp, txHash, isPrivate }`
- Display in feed on home page

---

### CATEGORY 4 — Confidential Payments (Tongo)

> Goal: Users can send and receive private transfers where amounts are hidden on-chain via ZK proofs.

#### 4.1 Tongo Helper Module (`lib/tongo.ts`)
- `initTongo(wallet)` — creates `TongoConfidential` instance
- `fundConfidential(amount, token)` — moves public ERC20 into confidential balance (STRK, ETH, or USDC)
- `sendPrivate(recipientId, amount, token)` — confidential transfer
- `withdrawConfidential(amount, token, toAddress)` — back to public ERC20
- `ragequit()` — emergency full withdrawal

#### 4.2 Send Flow (Private)
- Input: recipient's Tongo address (base58 or QR scan via `html5-qrcode`)
- Input: amount + token selector (STRK / ETH / USDC)
- Show "amount will be hidden on-chain" indicator
- Call `wallet.tx().confidentialTransfer(confidential, { recipientId, amount }).send()`
- Confirm with preflight simulation before submitting

#### 4.3 Fund & Withdraw Flows
- **Fund**: Move STRK, ETH, or USDC from public wallet → confidential balance
  - `.confidentialFund(confidential, { amount, token })`
  - Token selector shown — user picks which asset to make private
- **Withdraw**: Move confidential balance → public address
  - `.confidentialWithdraw(confidential, { amount, to })`
  - Used to cash out

#### 4.4 Confidential Balance Display
- Show confidential balance on home page (user knows their own amount)
- Show "Private" badge on transactions that used Tongo
- Pending balance: show with "Pending rollover" badge + rollover button

#### 4.5 ZK Proof UX
- Show "Generating proof..." loading state during client-side proof generation (<1s per Tongo docs)
- Show "Verifying on-chain..." during transaction submission
- Error states: insufficient balance, invalid recipient address

---

### CATEGORY 5 — Group Expenses

> Goal: Users can create groups, add shared expenses, and privately settle balances.

#### 5.1 Data Model
```
Group: { id, name, members: [{ userId, tongoId, starknetAddress, displayName }], createdAt }
Expense: { id, groupId, paidBy, amount, description, splits: [{ userId, amount }], settledBy: [] }
Settlement: { id, groupId, from, to, amount, txHash, isPrivate }
```

#### 5.2 Storage Strategy
- Groups and expenses synced via **Supabase** (Postgres + Realtime) for cross-device access
- Local IndexedDB cache (`idb-keyval`) for offline reads and optimistic UI
- Each user authenticated to Supabase via their Privy user ID (no separate account)
- Settlement recorded after on-chain tx confirmed, then synced to Supabase

#### 5.3 Create Group Flow
- Name the group
- Add members: search by phone number (resolved to Starknet/Tongo address via resolver), or paste Tongo address directly
- Phone number is the unique user identifier — stored hashed in Supabase, resolved on lookup
- Share invite link (URL with group config encoded)

#### 5.4 Add Expense Flow
- Who paid? (select from group members)
- Amount + description
- Split method: equal split (default), custom amounts
- Creates `Expense` record locally with calculated splits

#### 5.5 Settle Up Flow
- Show net balances per member (who owes whom)
- One-tap "Settle" → builds `wallet.tx().confidentialTransfer(...)` for private settlement
- Alternatively allow public transfer if user prefers
- Mark expense as settled after tx confirmation

#### 5.6 Groups Page (`app/(app)/groups/page.tsx`)
- List of groups with total unsettled amount
- Click group → expense list + net balances + settle button
- "New Group" button (header or floating)

---

### CATEGORY 6 — Yield & Earn

> Goal: Users can stake idle STRK to earn yield, set up DCA, and view earnings.

#### 6.1 Staking Flow
- Display available STRK staking pools via `wallet.getStakerPools()`
- Show APY per pool (from Starkzap SDK)
- One-tap stake: `wallet.tx().stake(poolAddress, amount).send()`
- Smart staking: SDK auto-detects new vs existing pool member
- Show staked balance + unclaimed rewards

#### 6.2 Claim & Unstake
- Claim rewards: `wallet.tx().claimRewards(poolAddress).send()`
- Exit pool: `wallet.tx().exitPool(poolAddress).send()`
- Display estimated wait time for unstaking

#### 6.3 DCA (Dollar-Cost Averaging)
- Set up recurring buy: token pair, amount, frequency (daily/weekly)
- `wallet.tx().createDCA({ from, to, amount, frequency }).send()`
- View active DCA orders + cancel option

#### 6.4 Lending (via Vesu)
- Deposit to earn yield: `wallet.tx().lendDeposit(token, amount).send()`
- Withdraw from lending: `wallet.tx().lendWithdraw(token, amount).send()`
- Show current APY, deposited amount, accrued interest

#### 6.5 Earn Page (`app/(app)/earn/page.tsx`)
- Tabs: Staking | DCA | Lending
- Summary card: total earning, total deposited
- Each position shown as card with APY, balance, action buttons

---

### CATEGORY 7 — UI/UX & Navigation

> Goal: A polished, consumer-grade web interface that feels like a fintech app, not a crypto app.

#### 7.1 Navigation Structure (App Router)
```
app/
├── layout.tsx               ← Root: Privy provider, SDK init, auth guard
├── globals.css              ← Tailwind v4 theme + custom design tokens
├── (auth)/
│   ├── login/page.tsx       ← Social login
│   ├── otp/page.tsx         ← Email OTP verification
│   ├── phone/page.tsx       ← Phone number entry
│   └── onboard/page.tsx     ← Intro slides
└── (app)/
    ├── layout.tsx           ← App shell with sidebar/nav
    ├── page.tsx             ← Home: balance + recent activity + quick actions
    ├── send/page.tsx        ← Send (private or public) + QR scan
    ├── receive/page.tsx     ← Show QR (public or private address)
    ├── groups/
    │   ├── page.tsx         ← Group list
    │   └── [id]/page.tsx    ← Single group detail
    └── earn/page.tsx        ← Staking, DCA, lending
```

#### 7.2 Responsive Layout
- Desktop: sidebar navigation + main content area
- Tablet: collapsible sidebar
- Mobile: bottom tab navigation (matching original mobile UX)
- Use Tailwind CSS 4 responsive utilities (`sm:`, `md:`, `lg:`)

#### 7.3 Shared Components
- `BalanceCard` — shows public + confidential balance, toggleable visibility
- `TransactionItem` — single tx row with private/public badge
- `AmountInput` — numeric input with token selector
- `GroupCard` — group name, member count, unsettled amount
- `AddressDisplay` — shortened address with copy button
- `QRScanner` — camera-based QR scanner using `html5-qrcode` (wrapped in client component)
- `QRCode` — QR code display using `qrcode.react`
- `PrivacyBadge` — "Private" chip shown on confidential txs
- All components built with standard HTML elements (`div`, `span`, `button`, `input`, `form`)

#### 7.4 Design System
- Color palette: dark background (#0D0D0D), accent purple (#7B5EA7), success green (#4CAF50)
- Typography: Inter font loaded via `next/font/google`
- All amounts shown in fiat equivalent (USD) by default, toggle to token amount
- Skeleton loaders for all async data
- Page transitions via `framer-motion`
- Dark mode by default with potential light mode toggle

#### 7.5 Onboarding UX
- Slide 1: "Send money privately" — explain hidden amounts
- Slide 2: "No gas fees, ever" — explain AVNU sponsorship
- Slide 3: "Sign in with Google — no seed phrases" — explain Privy

---

### CATEGORY 8 — Testing & Deployment

> Goal: Verified working on Sepolia testnet, then shipped to mainnet with grants applied.

#### 8.1 Unit Tests
- Test `lib/tongo.ts` functions with mocked provider
- Test `lib/starkzap.ts` initialization
- Test Zustand store actions
- Test amount parsing/formatting utilities
- Test framework: Vitest (recommended for Next.js) or Jest

#### 8.2 Integration Tests (Sepolia Testnet)
- Full send flow: fund → confidential transfer → verify recipient balance
- Group settle flow: create group → add expense → settle
- Stake flow: stake → wait → claim rewards

#### 8.3 E2E Tests
- Playwright for end-to-end browser testing
- Test auth flows (login, OTP, onboarding)
- Test send/receive flows
- Test responsive layout at different breakpoints

#### 8.4 Network Configuration
- **Sepolia (default)**: `alpha-sepolia.starknet.io` RPC, Sepolia token addresses, Sepolia Tongo contract
- **Mainnet (ready)**: `alpha-mainnet.starknet.io` RPC, Mainnet addresses pre-configured — activate via `NEXT_PUBLIC_NETWORK=mainnet`
- Faucet integration for Sepolia test funds
- All constants in `constants/tokens.ts` keyed by network — no hardcoded addresses in logic

#### 8.5 Build & Deployment
- Build: `next build` (generates optimized static + server bundles)
- Deploy to **Vercel** (recommended for Next.js) or any Node.js-compatible host
- Environment variables set via hosting platform dashboard (Vercel env vars, etc.)
- Custom domain setup
- SSL/TLS handled automatically by hosting platform

#### 8.6 Grants & Funding
- Apply to **Starknet Seed Grant** ($25K STRK) at starknet.io/grants
- Apply to **AVNU Propulsion Program** (up to $1M gas coverage) at propulsion.starknet.org
- Register at `portal.avnu.fi` as Propulsion grantee after approval

---

## 4. Build Order (Recommended Sequence)

```
Category 1 (Foundation)
    → Category 2 (Auth)
        → Category 3 (Wallet Layer)
            → Category 4 (Confidential Payments)   ← Core differentiator, build early
            → Category 5 (Groups)                  ← Can be built in parallel with Cat 4
            → Category 6 (Yield/Earn)              ← Build after core payments work
                → Category 7 (UI Polish)           ← Layer on top of working features
                    → Category 8 (Testing & Deploy)
```

---

## 5. Decisions

1. **Framework**: Next.js 15 with App Router for SSR/SSG capabilities, file-based routing, and first-class TypeScript support. No React Native, no Expo — pure web.
2. **Backend**: Supabase for cross-device group/expense sync. Local IndexedDB cache (via `idb-keyval`) for offline reads and optimistic UI.
3. **Tokens**: STRK, ETH, and USDC — all supported for public and confidential transfers.
4. **Fiat on-ramp**: Skip custom integration. Only include if MoonPay/Transak provide a web SDK that fits cleanly into the flow — otherwise out of scope.
5. **Contacts**: Phone number is the unique user identity. Resolver maps phone (hashed) → Starknet/Tongo address via Supabase. Fallback: paste address manually.
6. **Network**: Sepolia testnet as primary for all development and testing. Mainnet pre-configured and switchable via a single env var (`NEXT_PUBLIC_NETWORK`) — no code changes required to go live.
7. **Styling**: Tailwind CSS 4 with CSS-first configuration. No `tailwind.config.js` — all theme customization via `@theme` in `globals.css`.
8. **Local Storage**: `localStorage` for Tongo key and preferences. IndexedDB (via `idb-keyval`) for transaction history cache. Both are browser-native — no native modules or polyfills needed.
9. **QR Scanning**: `html5-qrcode` for camera-based QR scanning in the browser. Requires HTTPS in production and user camera permission.
10. **No Metro / No Polyfills**: The web build uses `starkzap` (not `starkzap-native`), runs in standard browser environments with native `crypto`, `Buffer`, `TextEncoder`, and `fetch`. No metro.config.js, no babel polyfills, no shim packages.

---

## 6. Key Migration Notes (Mobile → Web)

| Area | Mobile (React Native + Expo) | Web (Next.js 15) |
|---|---|---|
| Framework | React Native + Expo | Next.js 15 (App Router) |
| Routing | Expo Router (file-based) | Next.js App Router (file-based) |
| Styling | NativeWind (Tailwind for RN) | Tailwind CSS 4 (native) |
| Blockchain SDK | `starkzap-native` | `starkzap` (web build) |
| Auth | `@privy-io/expo` | `@privy-io/react-auth` |
| Secure Storage | `expo-secure-store` | `localStorage` |
| Async Storage | `AsyncStorage` | IndexedDB via `idb-keyval` |
| Local Database | `expo-sqlite` | IndexedDB via `idb-keyval` |
| QR Generation | `react-native-qrcode-svg` | `qrcode.react` |
| QR Scanning | `expo-camera` | `html5-qrcode` |
| Icons | `@expo/vector-icons` | `lucide-react` |
| UI Primitives | `View`, `Text`, `Pressable` | `div`, `span`, `button` |
| Font Loading | `expo-font` | `next/font/google` |
| Animations | `react-native-reanimated` | `framer-motion` |
| Polyfills | `buffer`, `fast-text-encoding`, `@ethersproject/shims` | None needed |
| Build Config | `metro.config.js` with `withStarkzap()` | `next.config.ts` (standard) |
| Deployment | Expo EAS Build → App Store / Play Store | Vercel / Node.js host → browser |
