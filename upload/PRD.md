
# SpiceUP — PRD & Architecture Document

---

## 1. Product Overview

### What is SpiceUP?
SpiceUP is a privacy-first group payments and remittance mobile app built on Starknet. It lets users send money privately, split group expenses, and earn yield on idle funds — all without gas fees, seed phrases, or crypto knowledge.

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
| Mobile Framework | React Native + Expo | Cross-platform iOS/Android/Web |
| Navigation | Expo Router (file-based) | Screen routing and deep links |
| Blockchain SDK | Starkzap v2 (`starkzap-native`) | Wallet, transfers, staking, swaps |
| Privacy Layer | Tongo (`TongoConfidential`) | ZK confidential transfers |
| Auth | Privy (`@privy-io/expo`) | Social login, embedded wallets |
| Gasless | AVNU Propulsion Paymaster | Sponsor all user transactions |
| State Management | Zustand | Global app state |
| Local Storage | Expo SecureStore | Tongo private key storage |
| Backend | Supabase (Postgres + Realtime) | Cross-device group/expense sync |
| Network | Starknet Sepolia (primary) + Mainnet (env-switchable) | |
| Chain Config | STRK: `0x04718f5a...`, ETH: `0x049d365...` | Token addresses |
| RPC | `alpha-mainnet.starknet.io` / `alpha-sepolia.starknet.io` | |
| Styling | NativeWind (TailwindCSS for RN) | UI styling |
| Language | TypeScript (strict) | All code |

---

## 3. Development Categories & Subdivisions

---

### CATEGORY 1 — Foundation & Infrastructure

> Goal: A working, runnable Expo project with all dependencies installed and configured.

#### 1.1 Project Scaffolding
- Initialize Expo project with TypeScript template in `/home/devair/Documents/SpiceUP`
- Set up directory structure: `app/`, `components/`, `lib/`, `hooks/`, `constants/`, `assets/`
- Initialize git repository with `.gitignore`

#### 1.2 Dependency Installation
- `starkzap-native` — core SDK (React Native build)
- `react-native-get-random-values`, `fast-text-encoding`, `buffer`, `@ethersproject/shims` — polyfills required by starkzap-native
- `@privy-io/expo` — Privy social login for Expo
- `expo-router` — file-based navigation
- `expo-secure-store` — secure key storage for Tongo private key
- `expo-crypto` — cryptographic utilities
- `zustand` — state management
- `nativewind` + `tailwindcss` — styling
- `react-native-reanimated` — animations
- `@expo/vector-icons` — icons

#### 1.3 Metro Configuration
- Wrap `metro.config.js` with `withStarkzap()` from `starkzap-native/metro`
- This injects polyfills and resolves native module compatibility

#### 1.4 TypeScript Configuration
- Enable strict mode
- Set up path aliases (`@/lib`, `@/components`, `@/hooks`, `@/constants`)
- Configure `tsconfig.json` for Expo + ESM

#### 1.5 Environment Configuration
- Create `.env` file for secrets (Privy App ID, AVNU API key)
- Create `app.json` with Expo app config (bundle IDs, splash, icons)
- Set up `babel.config.js` with NativeWind and Reanimated plugins

---

### CATEGORY 2 — Auth & Identity

> Goal: Users can sign in with email or Google. A Starknet wallet is created/restored automatically. Tongo private key is generated and stored securely.

#### 2.1 Privy Integration
- Initialize Privy provider in root `_layout.tsx` with App ID
- Configure supported login methods: email (OTP), Google OAuth
- Set up embedded wallet creation on first login (Privy manages the Starknet key)

#### 2.2 Starkzap Wallet Initialization
- On login success, call `sdk.onboard()` with `OnboardStrategy.Privy`
- Set `deploy: "if_needed"` so the Starknet account is deployed on first transaction
- Store wallet reference in Zustand store
- Configure paymaster: AVNU Propulsion API key → `feeMode: "sponsored"`

#### 2.3 Tongo Key Management
- On first login, generate a Tongo private key (separate from Starknet key)
- Store it encrypted in `expo-secure-store`
- On subsequent logins, load from SecureStore
- Initialize `TongoConfidential` with the key, Tongo contract address (per network), and provider

#### 2.4 Auth Screens
- **Login Screen** (`app/(auth)/login.tsx`): Social login buttons (Google, Email)
- **OTP Screen** (`app/(auth)/otp.tsx`): Email OTP verification
- **Phone Screen** (`app/(auth)/phone.tsx`): Phone number entry + SMS OTP — phone becomes the user's unique identity for the contact resolver
- **Onboarding Screen** (`app/(auth)/onboard.tsx`): 3-slide intro explaining privacy + gasless UX
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
- Network driven by `EXPO_PUBLIC_NETWORK` env var: `"sepolia"` (default) or `"mainnet"`
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
- Generate QR code from the user's Starknet address (for public transfers)
- Generate QR code from the user's Tongo `recipientId` (for confidential transfers)
- Toggle between "Public address" and "Private address" on receive screen

#### 3.5 Transaction History
- Store transaction records locally (AsyncStorage/SQLite) since Tongo amounts are hidden on-chain
- Each record: `{ type, amount, counterparty, timestamp, txHash, isPrivate }`
- Display in feed on home screen

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
- Input: recipient's Tongo address (base58 or QR scan)
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
- Show confidential balance on home screen (user knows their own amount)
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
- Local SQLite cache (`expo-sqlite`) for offline reads and optimistic UI
- Each user authenticated to Supabase via their Privy user ID (no separate account)
- Settlement recorded after on-chain tx confirmed, then synced to Supabase

#### 5.3 Create Group Flow
- Name the group
- Add members: search by phone number (resolved to Starknet/Tongo address via resolver), or paste Tongo address directly
- Phone number is the unique user identifier — stored hashed in Supabase, resolved on lookup
- Share invite link (deep link with group config encoded)

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

#### 5.6 Groups Screen (`app/(app)/groups.tsx`)
- List of groups with total unsettled amount
- Tap group → expense list + net balances + settle button
- "New Group" FAB button

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

#### 6.5 Earn Screen (`app/(app)/earn.tsx`)
- Tabs: Staking | DCA | Lending
- Summary card: total earning, total deposited
- Each position shown as card with APY, balance, action buttons

---

### CATEGORY 7 — UI/UX & Navigation

> Goal: A polished, consumer-grade interface that feels like a fintech app, not a crypto app.

#### 7.1 Navigation Structure
```
app/
├── _layout.tsx              ← Root: Privy provider, SDK init, auth guard
├── (auth)/
│   ├── login.tsx            ← Social login
│   └── onboard.tsx          ← Intro slides
└── (app)/
    ├── _layout.tsx          ← Bottom tab navigator
    ├── home.tsx             ← Balance + recent activity + quick actions
    ├── send.tsx             ← Send (private or public) + QR scan
    ├── receive.tsx          ← Show QR (public or private address)
    ├── groups.tsx           ← Group list
    ├── group/[id].tsx       ← Single group detail
    └── earn.tsx             ← Staking, DCA, lending
```

#### 7.2 Shared Components
- `BalanceCard` — shows public + confidential balance, toggleable visibility
- `TransactionItem` — single tx row with private/public badge
- `AmountInput` — numeric input with token selector
- `GroupCard` — group name, member count, unsettled amount
- `AddressDisplay` — shortened address with copy button
- `QRScanner` — camera-based QR scanner for addresses
- `PrivacyBadge` — "Private" chip shown on confidential txs

#### 7.3 Design System
- Color palette: dark background (#0D0D0D), accent purple (#7B5EA7), success green (#4CAF50)
- Typography: Inter font (expo-font)
- All amounts shown in fiat equivalent (USD) by default, toggle to token amount
- Skeleton loaders for all async data

#### 7.4 Onboarding UX
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

#### 8.2 Integration Tests (Sepolia Testnet)
- Full send flow: fund → confidential transfer → verify recipient balance
- Group settle flow: create group → add expense → settle
- Stake flow: stake → wait → claim rewards

#### 8.3 Network Configuration
- **Sepolia (default)**: `alpha-sepolia.starknet.io` RPC, Sepolia token addresses, Sepolia Tongo contract
- **Mainnet (ready)**: `alpha-mainnet.starknet.io` RPC, Mainnet addresses pre-configured — activate via `EXPO_PUBLIC_NETWORK=mainnet`
- Faucet integration for Sepolia test funds
- All constants in `constants/tokens.ts` keyed by network — no hardcoded addresses in logic

#### 8.4 Build & Release
- Expo EAS Build for iOS and Android
- Web build via `npx expo export`
- Environment variables via EAS Secrets
- App Store / Play Store submission checklist

#### 8.5 Grants & Funding
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

1. **Backend**: Supabase for cross-device group/expense sync. Local SQLite cache for offline.
2. **Tokens**: STRK, ETH, and USDC — all supported for public and confidential transfers.
3. **Fiat on-ramp**: Skip custom integration. Only include if MoonPay/Transak provide a native SDK that fits cleanly into the flow — otherwise out of scope.
4. **Contacts**: Phone number is the unique user identity. Resolver maps phone (hashed) → Starknet/Tongo address via Supabase. Fallback: paste address manually.
5. **Network**: Sepolia testnet as primary for all development and testing. Mainnet pre-configured and switchable via a single env var — no code changes required to go live.
