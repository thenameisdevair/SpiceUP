# SpiceUP Web — Worklog

## Category 1 — Foundation & Infrastructure

**Date**: 2025-04-13
**Task ID**: 2
**Status**: ✅ Complete

---

### Summary

Successfully scaffolded the SpiceUP web project as a Next.js 15/16 application with App Router, TypeScript, Tailwind CSS 4, and all required dependencies installed. The app compiles and runs with zero lint errors.

### What was built

#### 1. Project Scaffold
- Next.js 16 with App Router (Turbopack)
- TypeScript strict mode
- `src/` directory structure
- Path alias `@/*` → `./src/*`

#### 2. Dependencies Installed
All dependencies from the PRD were installed:
- `zustand@5.0.6` — state management
- `@privy-io/react-auth@3.21.2` — Privy social login
- `@supabase/supabase-js@2.103.0` — backend client
- `qrcode.react@4.2.0` — QR generation
- `html5-qrcode@2.3.8` — QR scanning
- `starkzap@2.0.0` — Starknet SDK
- `idb-keyval@6.2.2` — IndexedDB storage
- `framer-motion@12.23.2` — animations (pre-installed)
- `lucide-react@0.525.0` — icons (pre-installed)
- `clsx@2.1.1` + `tailwind-merge@3.3.1` — utility classes (pre-installed)

#### 3. Configuration Files
- `next.config.ts` — Turbopack config, standalone output
- `.env.local` — Environment variables (NEXT_PUBLIC_NETWORK, PRIVY_APP_ID, AVNU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
- `globals.css` — Tailwind CSS v4 with custom SpiceUP theme tokens

#### 4. Directory Structure
```
src/
├── app/
│   ├── layout.tsx              ← Root layout (Inter font, dark theme)
│   ├── page.tsx                ← Landing page (SpiceUP branding)
│   ├── globals.css             ← Tailwind v4 + custom theme
│   ├── (auth)/
│   │   ├── layout.tsx          ← Auth layout
│   │   ├── login/page.tsx      ← Login page (visual)
│   │   └── onboard/page.tsx    ← 3-slide onboarding (visual)
│   └── (app)/
│       ├── layout.tsx          ← App layout + TabBar
│       ├── home/page.tsx       ← Dashboard placeholder
│       └── settings/page.tsx   ← Settings placeholder
├── components/
│   ├── ui/
│   │   ├── Button.tsx          ← Reusable button (5 variants)
│   │   ├── Input.tsx           ← Text input with label/error/icon
│   │   ├── Card.tsx            ← Card container + CardHeader
│   │   ├── Badge.tsx           ← Badge/chip (5 color variants)
│   │   └── Skeleton.tsx        ← Skeleton loader + presets
│   ├── TabBar.tsx              ← Bottom tab navigation (Home/Groups/Earn/Settings)
│   ├── PrivacyBadge.tsx        ← "Private" badge component
│   └── AddressDisplay.tsx      ← Shortened address with copy
├── lib/
│   ├── env.ts                  ← Typed env variable access
│   ├── storage.ts              ← localStorage wrapper
│   └── utils.ts                ← cn() utility (pre-existing)
├── stores/
│   ├── auth.ts                 ← Zustand auth store
│   ├── wallet.ts               ← Zustand wallet store
│   └── toast.ts                ← Toast notification store
├── constants/
│   ├── ui.ts                   ← Design system tokens
│   ├── network.ts              ← Starknet network config
│   └── tokens.ts               ← Token definitions (STRK/ETH/USDC)
└── hooks/                      ← Empty, ready for Cat 2+
```

#### 5. Design System
- **Background**: #0D0D0D
- **Surface**: #141414
- **Border**: #222222
- **Accent (Purple)**: #7B5EA7
- **Success (Green)**: #4CAF50
- **Warning**: #FF9800
- **Error**: #EF4444
- **Font**: Inter via next/font/google

#### 6. Pages
- **Landing page** (`/`) — Full SpiceUP branding with hero section, feature cards, and CTA buttons. Dark theme with gradient accents and framer-motion animations.
- **Login** (`/login`) — Email input + Google OAuth button (visual only)
- **Onboarding** (`/onboard`) — 3-slide animated carousel (Private payments, No gas fees, No seed phrases)
- **Home Dashboard** (`/home`) — Balance card with visibility toggle, quick actions (Send/Receive/Earn), empty transaction list
- **Settings** (`/settings`) — Wallet info display, settings sections, logout button

### Verification
- ✅ `bun run lint` passes with 0 errors
- ✅ `GET /` returns 200
- ✅ Dev server boots without errors
- ✅ No TypeScript errors

### Notes for Next Categories
- Privy provider will be wired in Category 2
- Starkzap SDK imports are not used in Cat 1 pages (no runtime errors)
- Webpack fallback config can be re-added when starkzap integration is needed
- All shadcn/ui components are available in `src/components/ui/`

---

## Category 2 — Auth & Identity

**Date**: 2025-04-13
**Task ID**: 3
**Status**: ✅ Complete

---

### Summary

Built the complete mock authentication system for SpiceUP. Since we don't have a real Privy App ID, a mock auth system was created that simulates the full auth flow (email login → OTP verification → phone number → session persistence). The mock stores everything in localStorage so sessions survive page reloads. All routes are protected by auth guards, and the end-to-end flow works: Login → OTP → Phone → Home → Settings → Logout → Login.

### What was built

#### 1. Mock Auth System (`src/lib/mockAuth.ts`)
- **Deterministic Starknet addresses**: Generated from email using a hash function — same email always produces the same 66-char hex address
- **Deterministic Tongo recipient IDs**: Derived from Starknet address
- **Random Tongo private keys**: Generated via Web Crypto API (`crypto.getRandomValues`) for real randomness
- **Mock Privy user IDs**: Deterministic from email
- **Session persistence**: Full `MockSession` object stored in localStorage as JSON
- **Session restore**: `loadSession()` reads from localStorage on app mount
- **Session destroy**: `destroySession()` clears all auth-related localStorage keys
- **Email validation**: Basic regex check
- **OTP validation**: Accepts any 6-digit string (mock)

#### 2. Storage Keys Updated (`src/lib/storage.ts`)
- Added `authSession` and `tempEmail` keys to `STORAGE_KEYS`
- Existing `tongoPrivateKey` and `phoneNumber` keys retained

#### 3. Auth Hooks

**`src/hooks/useAuthInit.ts`**:
- On mount, checks localStorage for existing auth session
- If found, restores Starknet address, Tongo key, display name, phone number into Zustand auth store
- Sets status to "initializing" during check, then "ready" or "idle"
- Uses `useRef` to prevent double initialization

**`src/hooks/useAuthGuard.ts`**:
- Reads auth status from Zustand auth store
- Redirects unauthenticated users from app routes (`/home`, `/settings`, etc.) to `/login`
- Redirects authenticated users from auth routes (`/login`, `/otp`, `/phone`) to `/home`
- Only acts when status is definitive (not during "initializing")
- Public paths: `/login`, `/otp`, `/phone`, `/onboard`

#### 4. Root Layout (`src/app/layout.tsx`)
- Updated with proper metadata and globals.css import
- Dark theme, Inter font configured
- No Privy provider wrapper (mock auth doesn't need it)

#### 5. Login Page (`src/app/(auth)/login/page.tsx`)
- Email input with mail icon using shared `Input` component
- Email validation with inline error messages
- "Continue with Email" button → stores temp email in localStorage → redirects to `/otp`
- "Continue with Google" button (visual only, not functional)
- Loading state on submit
- Privacy note at bottom

#### 6. OTP Page (`src/app/(auth)/otp/page.tsx`)
- 6-digit OTP input with individual input boxes
- Auto-advance on digit entry, backspace to go back
- Paste support (paste full code into first input)
- Back button to return to login
- Verifies OTP → creates full mock session → updates auth store → redirects to `/phone`
- "Demo mode" hint showing any 6-digit code works
- Resend link (visual only)

#### 7. Phone Page (`src/app/(auth)/phone/page.tsx`)
- Phone number input with formatting (allows digits, +, -, parens)
- Optional — can skip
- "Continue" saves phone to session and redirects to `/home`
- "Skip for now" goes directly to `/home`
- Welcome message with user's display name

#### 8. Onboarding Page (`src/app/(auth)/onboard/page.tsx`)
- 3-slide animated carousel with framer-motion
  - Slide 1: "Send money privately" — ZK proofs hide amounts
  - Slide 2: "No gas fees, ever" — AVNU covers costs
  - Slide 3: "Sign in with email" — no seed phrases
- Animated pagination dots
- "Next" / "Get Started" / "Skip" navigation → `/login`
- Uses shared `Button` component

#### 9. App Layout (`src/app/(app)/layout.tsx`)
- `useAuthInit()` called on mount to restore session
- `useAuthGuard()` protects all app routes
- Shows skeleton loading state during initialization (matches home page layout)
- Renders children + TabBar when authenticated

#### 10. Home Page (`src/app/(app)/home/page.tsx`)
- Shows logged-in state with user's display name
- **Starknet Wallet card**: Displays shortened Starknet address with copy button using `AddressDisplay`
- **Tongo Recipient ID card**: Displays Tongo ID with `PrivacyBadge` ("ZK" label)
- Balance card with visibility toggle (unchanged)
- Quick action buttons: Send, Receive, Earn (visual only)
- Empty transaction list placeholder

#### 11. Settings Page (`src/app/(app)/settings/page.tsx`)
- **Account section**: Shows display name, phone number, avatar initial
- **Starknet Wallet**: Full shortened address with copy
- **Tongo Recipient ID**: Full shortened address with copy + ZK badge
- **Export Tongo Key**: Toggle show/hide private key with warning label
- **Network**: Shows "Sepolia"
- **Privacy Settings**: Visual only
- **About**: Terms of Service, Privacy Policy (visual only)
- **Log Out**: Clears all session data from localStorage and Zustand store, redirects to `/login`
- Loading state on logout button
- App version: "SpiceUP v0.1.0 — Built on Starknet"

### Auth Flow

1. User visits `/` → sees landing page
2. Navigate to `/onboard` → 3-slide carousel → "Get Started" → `/login`
3. Enter email → "Continue with Email" → temp email saved → `/otp`
4. Enter any 6-digit OTP → "Verify" → session created → `/phone`
5. Enter phone (or skip) → `/home` (now authenticated)
6. Home shows Starknet address + Tongo ID cards
7. Navigate to Settings → see all account info
8. Click "Export Tongo Key" → see private key
9. Click "Log Out" → session destroyed → `/login`
10. Revisit `/home` without login → redirected to `/login`
11. Login again with same email → same deterministic addresses

### Files Created/Modified

**Created:**
- `src/lib/mockAuth.ts` — Mock auth system (session management, address generation)
- `src/hooks/useAuthInit.ts` — Session restoration hook
- `src/hooks/useAuthGuard.ts` — Route protection hook
- `src/app/(auth)/otp/page.tsx` — OTP verification page
- `src/app/(auth)/phone/page.tsx` — Phone number page

**Modified:**
- `src/lib/storage.ts` — Added authSession and tempEmail storage keys
- `src/app/layout.tsx` — Cleaned up (metadata, globals.css import)
- `src/app/(auth)/login/page.tsx` — Full auth flow with Input/Button components
- `src/app/(auth)/onboard/page.tsx` — Navigation to /login with Button component
- `src/app/(app)/layout.tsx` — Auth init, guard, skeleton loading state
- `src/app/(app)/home/page.tsx` — Auth state display, wallet identity cards
- `src/app/(app)/settings/page.tsx` — User info, export key, logout functionality

### Verification
- ✅ `bun run lint` passes with 0 errors
- ✅ All routes return HTTP 200: `/login`, `/otp`, `/phone`, `/onboard`, `/home`, `/settings`
- ✅ Dev server compiles without errors
- ✅ Auth flow works end-to-end: Login → OTP → Phone → Home → Settings → Logout → Login
- ✅ Addresses are deterministic (same email = same Starknet address)
- ✅ Sessions persist across page reloads (localStorage)
- ✅ Tongo private keys are cryptographically random

---

## Category 3 — Core Wallet Layer

**Date**: 2025-04-13
**Task ID**: 4
**Status**: ✅ Complete

---

### Summary

Built the complete core wallet layer for SpiceUP, including transaction history management, balance display, mock balance hooks, send/receive flows, and all supporting UI components. All data is mock (no real blockchain connection) with localStorage persistence. The send flow implements a full stage machine (input → review → sending → done), and the receive page generates real QR codes. The home page now shows live token balances, a confidential balance card, quick actions, and recent transaction history with sample data.

### What was built

#### 1. Transaction History Module (`src/lib/txHistory.ts`)
- `TxRecord` type: `{ id, type, amount, token, counterparty, timestamp, txHash, isPrivate }`
- `TxType` union: `"send" | "receive"`
- `getTxHistory()`: Read all records from localStorage, sorted newest first
- `saveTx()`: Create a new record with auto-generated ID and timestamp, cap at 200 records
- `clearHistory()`: Remove all records from localStorage
- Storage key: `"spiceup.txHistory"`

#### 2. Format Utilities (`src/lib/format.ts`)
- `formatBalance(amount)`: Format token amounts to 4 decimal places, handles null/invalid gracefully
- `shortenAddress(address, chars)`: Shorten hex address with ellipsis (e.g., `0x1234...cdef`)
- `toFiat(amount, token)`: Stub returning `"$—"`, ready for price oracle integration
- `formatUsdValue(raw1e18)`: Format 1e18-scaled BigInt values (Solidity uint256)
- `formatTimestamp(ts)`: Relative time formatting (Just now, 5m ago, 3d ago, Jan 15)

#### 3. Balance Hook (`src/hooks/useBalance.ts`)
- Mock balances: ETH (0.5), STRK (100), USDC (50)
- Simulates 15-second polling with `setInterval`
- Adds ±1% random variation on each poll to simulate real data changes
- Stores results in wallet Zustand store via `setBalance()`
- Exposes `{ balances, loading, error, refresh }`

#### 4. Confidential Balance Hook (`src/hooks/useConfidentialBalance.ts`)
- Mock Tongo state: balance (2.5000 STRK), pending (0.3000), nonce (4)
- 15-second polling interval
- Stores in wallet store via `setConfidential()`
- Error handling with `setConfidentialUnavailable()` fallback

#### 5. Transaction History Hook (`src/hooks/useTransactionHistory.ts`)
- Lazy initialization via `useState(() => initializeTxHistory())`
- Seeds 6 sample transactions on first use (mixed send/receive, public/private, all 3 tokens)
- Sample timestamps spread across past 3 days
- `recordTx()`: Create new record and prepend to state
- `clearAll()`: Clear localStorage and state
- Returns `{ transactions, loaded, recordTx, clearAll }`

#### 6. Wallet Store (unchanged — already had the right shape)
- Existing `TokenBalance` interface: `{ symbol, amount, decimals, formatted }`
- Existing `ConfidentialState` interface: `{ balance, pending, nonce }`
- Actions: `setBalance`, `setConfidential`, `setLoading`, `setError`, `markUpdated`, `reset`

#### 7. Shared UI Components

**`src/components/BalanceCard.tsx`**:
- Token icon (2-letter abbreviation in colored circle)
- Symbol, name, formatted amount
- Eye icon toggle to hide balance (shows "••••••")
- Loading skeleton state
- Fiat value stub display
- Uses `framer-motion` for fade-in animation

**`src/components/ConfidentialBalanceCard.tsx`**:
- Purple gradient card with ZK PrivacyBadge
- Balance display with STRK denomination
- Pending balance and nonce info
- Fund/Withdraw action buttons
- Rollover button
- Unavailable state handling
- Loading skeleton state

**`src/components/TransactionItem.tsx`**:
- Directional icon (arrow up for send, lock for private, arrow down for receive)
- Color-coded: accent for sends, success for receives
- Private badge (purple chip) on confidential transactions
- Shortened counterparty address
- Amount with +/- prefix, color-coded
- Relative timestamp
- Staggered animation via `index` prop

**`src/components/AmountInput.tsx`**:
- Numeric input with decimal support (up to 6 decimal places)
- Token selector integration
- MAX button that fills the max available balance
- Focus ring animation
- Error display
- USD approximation hint

**`src/components/TokenSelector.tsx`**:
- Horizontal chip selector for ETH, STRK, USDC
- Color-coded tokens (blue/purple/green)
- Active/inactive visual states
- Uses token icons from `constants/tokens.ts`

#### 8. Receive Page (`src/app/(app)/receive/page.tsx`)
- Toggle between "Public" (Starknet address) and "Private" (Tongo recipient ID)
- Real QR code generation using `qrcode.react` (`QRCodeSVG`)
- Copy address button with checkmark feedback
- Animated transitions between modes
- Info note explaining public vs private
- Back navigation to home

#### 9. Send Page (`src/app/(app)/send/page.tsx`)
- **4-stage state machine**: input → review → sending → done
- Mode toggle: Public / Private
- Recipient address input with validation
- Amount input with token selector and MAX button
- Available balance display
- **Review stage**: Summary card with amount, recipient, network, type, privacy note
- **Sending stage**: Animated spinner with 2-second simulated delay
- **Done stage**: Success animation (spring), "Back to Home" / "Send Another" buttons
- Creates real tx records in history via `recordTx()`
- Private transactions get ZK PrivacyBadge and informational note

#### 10. Home Page (updated `src/app/(app)/home/page.tsx`)
- Welcome greeting based on display name
- **Total Balance hero card** with gradient background, showing ETH primary + STRK/USDC secondary
- **3 token balance cards** (ETH, STRK, USDC) using `BalanceCard` component
- **Confidential balance card** with ZK badge
- **Quick actions**: Send, Receive, Earn — now linked to actual pages
- **Recent transactions**: Shows up to 5 most recent transactions using `TransactionItem`
- **Loading states**: `BalanceCardSkeleton` × 3 while balances load, `TransactionListSkeleton` while tx loads
- Framer-motion staggered animations throughout

#### 11. TabBar (updated `src/components/TabBar.tsx`)
- 5 tabs: Home, Send, Receive, Groups, Settings
- Send (ArrowUpRight icon) and Receive (ArrowDownLeft icon) added
- Removed Earn from tab bar (accessible from home quick actions)
- Responsive sizing with smaller padding for 5-tab layout

### Files Created/Modified

**Created:**
- `src/lib/txHistory.ts` — Transaction history localStorage module
- `src/lib/format.ts` — Formatting utilities (balance, address, fiat, timestamp)
- `src/hooks/useBalance.ts` — Mock balance hook with polling
- `src/hooks/useConfidentialBalance.ts` — Mock Tongo confidential balance hook
- `src/hooks/useTransactionHistory.ts` — Transaction history hook with sample data
- `src/components/BalanceCard.tsx` — Token balance display card
- `src/components/ConfidentialBalanceCard.tsx` — ZK confidential balance card
- `src/components/TransactionItem.tsx` — Transaction list row
- `src/components/AmountInput.tsx` — Numeric amount input with token selector
- `src/components/TokenSelector.tsx` — Horizontal token picker chips
- `src/app/(app)/receive/page.tsx` — Receive page with QR code
- `src/app/(app)/send/page.tsx` — Send page with 4-stage flow

**Modified:**
- `src/app/(app)/home/page.tsx` — Full redesign with balance cards, confidential card, transactions, loading states
- `src/components/TabBar.tsx` — Added Send/Receive tabs, 5-tab layout

### Verification
- ✅ `bun run lint` passes with 0 errors
- ✅ Dev server compiles without errors
- ✅ Home page shows mock balances for ETH (0.5), STRK (100), USDC (50)
- ✅ Confidential balance card shows 2.5 STRK with ZK badge
- ✅ 6 sample transactions displayed in recent activity feed
- ✅ Tap "Receive" → see QR code for Starknet address / Tongo ID toggle
- ✅ Tap "Send" → enter address → enter amount → review → confirm → sending animation → success → tx in history
- ✅ Private mode on send shows ZK badge and privacy note
- ✅ Balance eye toggle hides/shows amounts
- ✅ TabBar shows 5 tabs: Home, Send, Receive, Groups, Settings

### Notes for Next Categories
- All balance data is mock — real Starknet RPC connection needed for production
- Transaction sends are simulated (create records in localStorage, no on-chain tx)
- `toFiat()` returns `"$—"` stub — needs price oracle integration
- QR codes work via `qrcode.react` (already installed in Category 1)
- Tongo contract interaction is fully mocked
- The earn page is accessible from home quick actions but not yet built

---

## Category 5 — Group Expenses

**Date**: 2025-04-13
**Task ID**: 6
**Status**: ✅ Complete

---

### Summary

Built the complete Group Expenses feature for SpiceUP — a privacy-first group payments system. This includes a groups data module with a mathematically correct `calcNetBalances` algorithm (greedy creditor/debtor matching), Zustand state management, React hooks, and four fully interactive pages: Groups List, New Group (3-stage flow), Group Detail (with settlement modal), and Add Expense (3-stage flow). All data is mocked with 2 sample groups containing realistic expense data.

### What was built

#### 1. Groups Data Module (`src/lib/groups.ts`)
- **TypeScript types**: `Group`, `GroupMember`, `Expense`, `ExpenseSplit`, `Settlement`, `NetBalance`
- **`calcNetBalances(expenses, settlements, selfId?)`**: Pure function implementing greedy creditor/debtor matching algorithm
  - Step 1: Build raw balance map per member from expenses (payer credited, each member debited by their share) and settlements (already settled amounts)
  - Step 2: Separate into creditors (positive balance) and debtors (negative balance), sorted descending
  - Step 3: Greedy matching — largest creditor paired with largest debtor, transfer minimum amount, repeat
  - Floating-point safety: rounds to 2 decimal places, 0.01 threshold for zero-check
- **Mock data**: 2 groups ("Dinner Squad" with 3 members, "Trip Fund" with 4 members), 3 expenses, 0 settlements
  - Dinner Squad: Pizza $30 (You paid, equal split) + Drinks $18 (Alice paid, equal split) → Net: Bob owes You $14, Bob owes Alice $2
  - Trip Fund: Hotel $400 (You paid, equal split) → Net: Carol/Dave/Eve each owe You $100
- **Helper functions**: `getMemberName`, `getGroupMembers`, `getGroupExpenses`, `getGroupSettlements`
- **Deterministic avatar colors**: Hash-based color assignment from member names

#### 2. Groups Zustand Store (`src/stores/groups.ts`)
- Combined `GroupsState` (groups array, loading, error) and `ExpensesState` (expenses, settlements)
- Actions: `setGroups`, `addGroup`, `setLoading`, `setError`, `setExpenses`, `addExpense`, `addSettlement`
- No localStorage persistence (Zustand only, as specified)

#### 3. useGroups Hook (`src/hooks/useGroups.ts`)
- Loads mock groups and expenses on first mount (with 300ms simulated delay)
- Prevents double-loading with length check
- Exposes `{ groups, loading, error, addGroup }`

#### 4. useGroupExpenses Hook (`src/hooks/useGroupExpenses.ts`)
- Takes `groupId`, filters expenses/settlements from global store
- Computes `netBalances` via `calcNetBalances` (reactive via `useMemo`)
- Returns `{ expenses, settlements, netBalances, members, addExpense, addSettlement }`

#### 5. GroupCard Component (`src/components/GroupCard.tsx`)
- Dark surface (#141414) card with rounded corners and hover border effect
- Group name + net balance badge (green "owed", red "owing", neutral "settled")
- Avatar stack: colored circles with 2-letter initials, overlap offset (-space-x-2)
- Remaining count badge for groups with 4+ members
- Member count with Users icon
- Framer-motion whileTap scale effect
- `computeSelfBalance()`: sums all net balances where self is involved

#### 6. ExpenseItem Component (`src/components/ExpenseItem.tsx`)
- Description + amount + payer name + relative timestamp
- "Your share" calculation and balance status label
- Color-coded balance: green (you're owed back), red (you owe), muted (settled)
- Top/bottom section with divider line

#### 7. Groups List Page (`src/app/(app)/groups/page.tsx`)
- Header with "Groups" title and "New Group" link (Plus icon)
- Loading state: 3 skeleton cards
- Empty state: centered icon, message, "Create Group" CTA button
- Populated state: staggered animation list of `GroupCard` components
- Per-group net balance computation via `useMemo`
- Floating action button (FAB): purple accent circle with + icon, fixed bottom-right above TabBar
- Navigate to `/groups/[id]` on card click

#### 8. New Group Page (`src/app/(app)/groups/new/page.tsx`)
- **3-stage state machine**: naming → adding_members → done
- **Stage indicator**: numbered circles with checkmarks for completed stages, connected by progress lines
- **Naming stage**: Input with min 2 chars validation, error messages, Enter key support
- **Adding members stage**: Search/add by name (mock), duplicate detection, member chips with remove button, self chip (always shown, non-removable), "Create Group" requires 1+ member
- **Done stage**: Success animation (spring scale), group name + member count, "Open Group" + "Back to Groups" buttons
- Deterministic avatar colors for added members

#### 9. Group Detail Page (`src/app/(app)/groups/[id]/page.tsx`)
- Header: group name + member count + "Add Expense" button
- **Net Balances section**: Self-involved balances (with directional icons, Settle button) + other-member balances (read-only, muted)
- **Expenses section**: Sorted newest-first, uses `ExpenseItem` component, empty state with "Add First Expense" button
- **Settlement Modal** (inline component):
  - Slide-up bottom sheet with backdrop (framer-motion)
  - Shows amount to settle, from → to names
  - Public/Private toggle (wallet/shield icons)
  - "Confirm & Settle" with 1.5s simulated delay
  - Success state: checkmark animation, "Settled!" message, "Done" button
  - Creates real `Settlement` record → net balances recalculate automatically
- Group-not-found fallback page

#### 10. Add Expense Page (`src/app/(app)/groups/[id]/add-expense/page.tsx`)
- **3-stage state machine**: input → reviewing → done
- **Input stage**:
  - "Who paid?" — member selector with avatar chip buttons (single selection, accent highlight)
  - Amount + token input (USDC/ETH/STRK dropdown), dollar icon
  - Description input with FileText icon
  - Split mode toggle: Equal (default) or Custom
  - Equal split: auto-calculated per-person amount with member count
  - Custom split: individual amount inputs per member + split total validation (green/red indicator)
- **Reviewing stage**: Summary card with amount, description, payer, split type, full split breakdown table
- **Done stage**: Success animation, "Back to Group" / "Add Another" buttons
- Auto-navigates to group detail on "Back to Group"
- "Add Another" resets form state for quick entry

### Mock Data Details

**Dinner Squad** (id: `dinner-squad`, 3 members: You, Alice, Bob):
- Expense 1: "Pizza night 🍕" — $30 USDC paid by You, equal split ($10 each)
- Expense 2: "Drinks at the bar 🍸" — $18 USDC paid by Alice, equal split ($6 each)
- Net balances: Bob → You: $14.00, Bob → Alice: $2.00

**Trip Fund** (id: `trip-fund`, 4 members: You, Carol, Dave, Eve):
- Expense 1: "Hotel booking 🏨" — $400 USDC paid by You, equal split ($100 each)
- Net balances: Carol → You: $100.00, Dave → You: $100.00, Eve → You: $100.00

### Files Created/Modified

**Created:**
- `src/lib/groups.ts` — Group types, calcNetBalances algorithm, mock data, helpers
- `src/stores/groups.ts` — Zustand store for groups + expenses + settlements
- `src/hooks/useGroups.ts` — Groups list hook with mock data loading
- `src/hooks/useGroupExpenses.ts` — Per-group expenses/balances/settlements hook
- `src/components/GroupCard.tsx` — Group card with avatar stack + net balance badge
- `src/components/ExpenseItem.tsx` — Expense list item with share/balance display
- `src/app/(app)/groups/page.tsx` — Groups list page with FAB + empty state
- `src/app/(app)/groups/new/page.tsx` — New group 3-stage flow
- `src/app/(app)/groups/[id]/page.tsx` — Group detail + settlement modal
- `src/app/(app)/groups/[id]/add-expense/page.tsx` — Add expense 3-stage flow

**Modified:**
- (none — all existing files unchanged)

### Verification
- ✅ `bun run lint` passes with 0 errors
- ✅ Dev server compiles without errors
- ✅ Groups page shows 2 sample groups with correct net balances ($14.00 owed for Dinner Squad, $300.00 owed for Trip Fund)
- ✅ Click group → see expenses list + net balances section
- ✅ Add expense flow: input → review → done → auto-navigate back
- ✅ Settle modal: tap "Settle" → slide-up modal → confirm → success checkmark → net balances update
- ✅ New group flow: naming → adding members → done → open group
- ✅ All routes are under `(app)` layout with TabBar (Groups tab highlights correctly)
- ✅ calcNetBalances is mathematically correct (verified with mock data scenarios)

### Notes for Next Categories
- All group data is mock (Zustand only, no persistence)
- Settlements are mock — no real Starknet transactions
- Group creation doesn't persist across page reloads
- calcNetBalances handles floating-point precision with rounding + threshold
- The algorithm minimizes number of transactions via greedy matching
- Custom split mode allows arbitrary amounts per member

---

## Category 4 — Confidential Payments (Tongo)

**Date**: 2025-04-13
**Task ID**: 5
**Status**: ✅ Complete

---

### Summary

Built the complete Confidential Payments feature for SpiceUP using Tongo (mock). This includes a Tongo helper module for address parsing, fund/withdraw pages with stage machines, enhanced send page with ZK proof stages for private transactions, a pending balance rollover UI, and ragequit emergency withdrawal. All blockchain operations are mocked — no real Tongo/Starknet calls are made. Transaction records for fund/withdraw/private-send appear in the home page activity feed with appropriate badges.

### What was built

#### 1. Tongo Helper Module (`src/lib/tongo.ts`)
- **`parseTongoQr(input)`**: Parses "tongo:x:y" format strings, validates BigInt components, returns `{ x: bigint, y: bigint }` or null
- **`isValidTongoAddress(input)`**: Convenience boolean wrapper around `parseTongoQr`
- **`formatTongoAddress(addr)`**: Formats a parsed address back to string
- **`shortenTongoAddress(input, chars)`**: Shortens Tongo addresses for display
- **Mock operations**: `mockFundConfidential()`, `mockSendPrivate()`, `mockWithdrawConfidential()`, `mockRagequit()` — all simulate blockchain delays and create tx records

#### 2. Updated Transaction History (`src/lib/txHistory.ts`)
- Extended `TxType` union: `"send" | "receive" | "fund" | "withdraw"`
- Fund and withdraw transactions now supported alongside send/receive

#### 3. Updated TransactionItem Component (`src/components/TransactionItem.tsx`)
- **Fund transactions**: Plus icon, purple accent color, "+amount" prefix, "ZK" badge
- **Withdraw transactions**: ArrowDownToLine icon, warning color, "-amount" prefix
- **Ragequit detection**: Shows red "Emergency" badge when counterparty contains "ragequit"
- **Tongo address display**: Uses `shortenTongoAddress()` for Tongo-format addresses
- Supports all 4 transaction types with appropriate icons, colors, and labels

#### 4. Updated ConfidentialBalanceCard (`src/components/ConfidentialBalanceCard.tsx`)
- **New props**: `onFund`, `onWithdraw`, `rollingOver`, `onRollover`
- **Pending balance banner**: Purple accent button "Activate pending balance" (shown when `pending > 0`)
- **Rollover spinner**: Shows "Activating pending balance..." with spinning RefreshCw icon during rollover
- **Rollover header button**: RefreshCw icon in header becomes spinner during rollover, disabled when no pending
- **Fund/Withdraw buttons**: Now wired to `onFund`/`onWithdraw` callbacks
- All animations preserved (framer-motion fade-in)

#### 5. Updated Send Page (`src/app/(app)/send/page.tsx`)
- **6-stage state machine**: input → review → zkProof → verifying → sending → done
- **Mode toggle**: Public / Private segmented control at top (same pattern as receive page)
- **Private mode features**:
  - Purple info banner with Lock icon: "Amount will be hidden on-chain via ZK proof"
  - Recipient input placeholder changes to "tongo:x:y" for private mode
  - Tongo address validation via `parseTongoQr()` — shows error for invalid format
- **ZK Proof stage** (private only): Purple spinner with "Generating ZK proof..." text (1.5s delay)
- **Verifying stage** (private only): Pulsing ShieldCheck icon with "Verifying on-chain..." text (1s delay)
- **Sending stage** (public only): Standard spinner with 2s delay
- **Done screen**: Purple "Private — amount hidden on-chain" badge with Lock icon
- Private txs recorded with `isPrivate: true` and `txHash: null`

#### 6. Fund Page (`src/app/(app)/fund/page.tsx`)
- **4-stage state machine**: input → reviewing → funding → done
- **Input stage**:
  - Purple info banner explaining "Move tokens from public wallet to private balance"
  - Token selector (ETH/STRK/USDC) + amount input with MAX button
  - Available public balance display
  - "How funding works" info card with 3 bullet points
  - "Review Funding" button
- **Reviewing stage**: Summary with amount, direction (Public → Confidential), token, ZK badge
- **Funding stage**: Purple spinner with 2s simulated delay
- **Done stage**: Success animation, "Funding Complete!" message, "Back to Home" / "Fund More" buttons
- Creates "fund" type tx record in history

#### 7. Withdraw Page (`src/app/(app)/withdraw/page.tsx`)
- **4-stage state machine**: input → reviewing → withdrawing → done
- **Input stage**:
  - Confidential balance card showing current ZK balance
  - Token selector + amount input (max = confidential balance)
  - Destination info: shows user's public wallet address for transparency
  - Purple info banner about confidential → public transfer
  - **Ragequit section** (below main form, separated by divider):
    - Red "Emergency Withdraw" header with AlertTriangle icon
    - Description text explaining irreversible action
    - Two-step confirmation: first tap → shows red confirmation card with balance amount, second tap → executes
    - Cancel button to dismiss confirmation
- **Reviewing stage**: Summary with direction (Confidential → Public), destination address
- **Withdrawing stage**: Spinner with 2s simulated delay (3s for ragequit)
- **Done stage**: Success animation, "Withdrawal Complete!" message
- Creates "withdraw" type tx record (with "(ragequit)" counterparty for emergency withdrawals)

#### 8. Updated Home Page (`src/app/(app)/home/page.tsx`)
- **Balance visibility toggle**: Eye/EyeOff icon button in header toggles all balances
- **ConfidentialBalanceCard** wired with:
  - `onFund` → `router.push("/fund")`
  - `onWithdraw` → `router.push("/withdraw")`
  - `onRollover` → mock 2-second rollover that adds pending to balance and resets pending to 0
  - `rollingOver` state for spinner
- Balance amounts passed as null when hidden (BalanceCard shows "••••••")
- ConfidentialBalanceCard balance also respects hide/show toggle

#### 9. App Layout (unchanged)
- Fund and withdraw routes automatically work under `(app)` layout with TabBar
- Not added to TabBar (accessed via ConfidentialBalanceCard buttons only)
- No layout changes needed — Next.js App Router handles nested routes automatically

### Files Created/Modified

**Created:**
- `src/lib/tongo.ts` — Tongo address parser, validator, mock operations (fund/send/withdraw/ragequit)
- `src/app/(app)/fund/page.tsx` — Fund page with 4-stage flow
- `src/app/(app)/withdraw/page.tsx` — Withdraw page with 4-stage flow + ragequit

**Modified:**
- `src/lib/txHistory.ts` — Extended TxType to include "fund" and "withdraw"
- `src/components/TransactionItem.tsx` — Support for fund/withdraw tx types, Tongo address display, ragequit badge
- `src/components/ConfidentialBalanceCard.tsx` — Added onFund/onWithdraw/rollingOver/onRollover props, pending balance banner, rollover UI
- `src/app/(app)/send/page.tsx` — ZK proof/verifying stages, tongo address validation, private mode info banner, done screen badge
- `src/app/(app)/home/page.tsx` — Balance visibility toggle, Fund/Withdraw button wiring, pending rollover handler

### Verification
- ✅ `bun run lint` passes with 0 errors
- ✅ Dev server compiles without errors
- ✅ Send page has Public/Private toggle at top
- ✅ Private mode shows purple ZK info banner and validates "tongo:x:y" format
- ✅ Private send shows ZK proof → verifying → done stages (total ~2.5s)
- ✅ Private txs recorded with `isPrivate: true` in history
- ✅ Fund page accessible from home (Fund button on ConfidentialBalanceCard)
- ✅ Fund page creates "fund" type tx record in history
- ✅ Withdraw page accessible from home (Withdraw button on ConfidentialBalanceCard)
- ✅ Withdraw page creates "withdraw" type tx record in history
- ✅ Ragequit shows destructive confirmation, creates "withdraw" tx with "(ragequit)" counterparty
- ✅ Pending rollover works: tap → 2s spinner → pending added to balance
- ✅ All new transaction types (fund/withdraw/private send) appear in home page activity feed
- ✅ TransactionItem shows appropriate icons, colors, and badges for all tx types
- ✅ Balance visibility toggle hides/shows all balances including confidential

### Notes for Next Categories
- All Tongo operations are fully mocked — no real contract interaction
- ZK proof stages are visual only (timed delays simulate proof generation)
- Fund/Withdraw pages are not in TabBar — accessed via ConfidentialBalanceCard buttons
- Ragequit simulates emergency exit with longer delay (3s vs 2s)
- The pending balance rollover updates Zustand state (does not persist to localStorage)
- `parseTongoQr()` accepts any valid `tongo:<bigint>:<bigint>` string — no blockchain validation

---

## Category 6 — Yield & Earn

**Date**: 2025-04-13
**Task ID**: 7
**Status**: ✅ Complete

---

### Summary

Built the complete Yield & Earn feature for SpiceUP — a multi-faceted earning dashboard encompassing Staking, DCA (Dollar Cost Averaging), and Lending. The Earn page features a clean dashboard layout with summary card, 3 internal sub-tabs, and dedicated action pages for each earning type. All blockchain operations are mocked with realistic data (validator pools, APYs, token amounts). Transaction records for staking, claiming rewards, DCA creation, lending deposits/withdrawals all appear in the home page activity feed with type-appropriate icons and colors.

### What was built

#### 1. Earn Types (`src/lib/earn.ts`)
- `StakerPool`: poolContract, token, totalDelegated, validatorName, apyPercent, commission
- `StakedPosition`: poolContract, validatorName, staked, rewards, unpooling
- `AppDcaOrder`: id, sellToken, buyToken, sellAmount, perCycleAmount, frequency, status, executedTrades, createdAt
- `AppLendingMarket`: poolId, poolName, token, totalDeposited, apyPercent
- `AppLendingPosition`: poolId, poolName, token, depositedAmount, apyPercent
- Supporting types: `DcaFrequency` ("Every 12h" | "Daily" | "Weekly"), `DcaOrderStatus` ("ACTIVE" | "INDEXING" | "CANCELLED")

#### 2. Earn Store (`src/stores/earn.ts`)
- Zustand store with three sub-states: `staking`, `dca`, `lending`
- Each sub-state has its own data array, loading flag, and error
- Actions for setting pools, positions, orders, markets, and their loading/error states
- `resetEarn()` to clear all earn state

#### 3. Mock Staking Module (`src/lib/staking.ts`)
- 3 mock validator pools: "Starknet Sentinel" (5.2% APY), "Void Validator" (4.8% APY), "StrkFi Pool" (null APY)
- 1 mock staked position: 100 STRK staked in Starknet Sentinel, 1.23 STRK rewards
- `getValidatorPools()`: returns pools with 800ms delay
- `getStakedPositions()`: returns positions with 600ms delay
- `stakeInPool()`: adds to existing or creates new position
- `claimPoolRewards()`: zeros rewards and returns claimed amount
- `beginUnstake()`: marks position as unpooling
- `finalizeUnstake()`: removes position and returns unstaked amount

#### 4. Mock DCA Module (`src/lib/dca.ts`)
- `DCA_FREQUENCY_OPTIONS`: ["Every 12h", "Daily", "Weekly"]
- 2 mock orders: STRK→ETH weekly (active, 3 trades), USDC→STRK daily (indexing, 0 trades)
- `getActiveDcaOrders()`: returns orders with 700ms delay
- `createDcaOrder()`: creates order with auto-calculated perCycleAmount, status INDEXING
- `cancelDcaOrder()`: sets status to CANCELLED, removes from active list

#### 5. Mock Lending Module (`src/lib/lending.ts`)
- 2 mock markets: USDC Lending Pool (4.2% APY, $12.5M total), ETH Lending Pool (3.1% APY, 4,200 total)
- 1 mock position: 500 USDC deposited in USDC pool
- `getLendingMarkets()`: returns markets with 800ms delay
- `getLendingPositions()`: returns positions with 600ms delay
- `depositToLending()`: adds to existing or creates new position
- `withdrawFromLending()`: subtracts from position, removes if zero

#### 6. Earn Hooks
- `useStaking.ts`: polls validator pools and staked positions every 30s, stores in earn Zustand
- `useDCA.ts`: polls DCA orders every 30s, stores in earn Zustand
- `useLending.ts`: polls lending markets and positions every 30s, stores in earn Zustand
- All hooks: initialized with useRef to prevent double-loading, expose refresh function

#### 7. Earn Page (`src/app/(app)/earn/page.tsx`)
- **Summary card**: Warning-tinted gradient showing Total Staked, Claimable Rewards, and Lent amounts
- **3 internal sub-tabs**: Staking | DCA | Lending (state-based toggle, not route tabs)
- **Staking tab**: List of PoolCard components, empty state, skeleton loading (3 items)
- **DCA tab**: List of DcaOrderCard components + "New DCA Order" button, empty state, skeleton loading (2 items)
- **Lending tab**: List of LendingMarketCard components, empty state, skeleton loading (2 items)
- Navigation: each card action navigates to appropriate sub-page with query params

#### 8. PoolCard Component (`src/components/PoolCard.tsx`)
- Validator name + Shield icon + total delegated amount
- APY display (success badge) or "— APY" (default badge) when null
- Commission display
- User position section (if staked): Your Stake + Rewards with color-coded values
- Unpooling indicator (yellow Clock icon + text)
- Action buttons: Stake (purple), Claim (secondary, green), Unstake (outline)
- Framer-motion staggered animation

#### 9. DcaOrderCard Component (`src/components/DcaOrderCard.tsx`)
- Token pair display: "STRK → ETH" with ArrowRightLeft icon
- Frequency label + status badge (ACTIVE=green, INDEXING=yellow)
- Details section: per-cycle amount, total budget, executed trades count
- Cancel Order button (destructive variant)
- Framer-motion staggered animation

#### 10. LendingMarketCard Component (`src/components/LendingMarketCard.tsx`)
- Pool name + Landmark icon + total deposited
- APY badge (success variant, always shown)
- User position section (if deposited): Deposited amount + estimated yearly earnings
- Action buttons: Deposit (primary), Withdraw (outline, shown only if deposited)
- Framer-motion staggered animation

#### 11. Stake Page (`src/app/(app)/earn/stake/page.tsx`)
- **4-stage state machine**: input → review → staking → done
- Pool info card at top (name, APY badge, current staked if unstaking)
- Amount input with MAX button and available balance display
- Review stage: amount, pool name, network, type (stake/unstake)
- Mock stake/unstake: 2s delay, creates "stake" or "unstake" tx record, refreshes earn store
- Done stage: success animation, "Back to Earn" / "Stake More" buttons
- Suspense boundary for useSearchParams

#### 12. Claim Page (`src/app/(app)/earn/claim/page.tsx`)
- **3-stage state machine**: confirm → claiming → done
- Shows claimable rewards amount (green text)
- Pool info card with validator name
- Claim button triggers 1.5s delay, creates "claim_rewards" tx record, refreshes earn store
- Done stage: success animation, rewards claimed message

#### 13. DCA Create Page (`src/app/(app)/earn/dca-create/page.tsx`)
- **4-stage state machine**: input → review → creating → done
- Token pair selection: sell token chips (yellow) + buy token chips (green)
- Total budget amount input with validation (sell ≠ buy)
- Auto-calculated per-cycle amount (based on 30-day period)
- Frequency selector: 3 toggle buttons (Every 12h / Daily / Weekly)
- Review stage: pair display, budget, per-cycle, frequency, network
- Mock create: 2s delay, creates "dca_create" tx record, refreshes earn store

#### 14. Lend Deposit Page (`src/app/(app)/earn/lend-deposit/page.tsx`)
- **4-stage state machine**: input → review → depositing → done
- Pool info card with name + APY badge
- Green APY info banner: "Earn X% APY on your TOKEN deposit"
- Amount input with MAX button + available balance + estimated yearly earnings
- Review stage: amount, pool, APY, est. yearly, network
- Mock deposit: 2s delay, creates "lend_deposit" tx record, refreshes earn store
- Suspense boundary for useSearchParams

#### 15. Lend Withdraw Page (`src/app/(app)/earn/lend-withdraw/page.tsx`)
- **4-stage state machine**: input → review → withdrawing → done
- Pool info card with deposited amount + APY badge
- Amount input with "Withdraw All" shortcut button
- Review stage: amount, pool, network, remaining balance calculation
- Mock withdraw: 2s delay, creates "lend_withdraw" tx record, refreshes earn store
- Suspense boundary for useSearchParams

#### 16. Updated TxType (`src/lib/txHistory.ts`)
- Extended to: `"send" | "receive" | "fund" | "withdraw" | "stake" | "unstake" | "claim_rewards" | "dca_create" | "lend_deposit" | "lend_withdraw"`

#### 17. Updated TransactionItem (`src/components/TransactionItem.tsx`)
- Earn type icon/color mapping:
  - stake: Zap icon, purple accent
  - unstake: Zap icon, warning color
  - claim_rewards: Gift icon, green/success
  - dca_create: ArrowRightLeft icon, warning color
  - lend_deposit: Landmark icon, green/success
  - lend_withdraw: Landmark icon, purple accent
- Earn transactions show type label (e.g., "Staked STRK", "Rewards STRK") without +/- prefix
- Amount shown as "X.XX TOKEN" instead of signed format
- Counterparty shows shortened validator/pool name

#### 18. Updated TabBar (`src/components/TabBar.tsx`)
- Now 6 tabs: Home, Send, Receive, Earn, Groups, Settings
- Earn tab with TrendingUp icon, linked to `/earn`
- Smaller sizing (18px icons, 9px labels, 44px min-width) for 6-tab layout
- All earn sub-routes (`/earn/stake`, `/earn/claim`, etc.) highlight the Earn tab via `pathname.startsWith`

### Files Created/Modified

**Created:**
- `src/lib/earn.ts` — Earn type definitions (StakerPool, StakedPosition, DCA, Lending)
- `src/stores/earn.ts` — Zustand earn store (staking/dca/lending sub-states)
- `src/lib/staking.ts` — Mock staking module (3 pools, 1 position, stake/claim/unstake ops)
- `src/lib/dca.ts` — Mock DCA module (2 orders, frequency options, create/cancel ops)
- `src/lib/lending.ts` — Mock lending module (2 markets, 1 position, deposit/withdraw ops)
- `src/hooks/useStaking.ts` — Staking data hook (30s polling)
- `src/hooks/useDCA.ts` — DCA data hook (30s polling)
- `src/hooks/useLending.ts` — Lending data hook (30s polling)
- `src/components/PoolCard.tsx` — Validator pool card with stake/claim/unstake actions
- `src/components/DcaOrderCard.tsx` — DCA order card with cancel action
- `src/components/LendingMarketCard.tsx` — Lending market card with deposit/withdraw actions
- `src/app/(app)/earn/page.tsx` — Earn main page (summary card + 3 sub-tabs)
- `src/app/(app)/earn/stake/page.tsx` — Stake page (4-stage flow)
- `src/app/(app)/earn/claim/page.tsx` — Claim page (3-stage flow)
- `src/app/(app)/earn/dca-create/page.tsx` — DCA create page (4-stage flow)
- `src/app/(app)/earn/lend-deposit/page.tsx` — Lend deposit page (4-stage flow)
- `src/app/(app)/earn/lend-withdraw/page.tsx` — Lend withdraw page (4-stage flow)

**Modified:**
- `src/lib/txHistory.ts` — Extended TxType with 6 earn types
- `src/components/TransactionItem.tsx` — Support for earn tx types with icons/colors/labels
- `src/components/TabBar.tsx` — Added Earn tab, 6-tab layout

### Verification
- ✅ `bun run lint` passes with 0 errors
- ✅ All earn routes return HTTP 200: `/earn`, `/earn/stake`, `/earn/claim`, `/earn/dca-create`, `/earn/lend-deposit`, `/earn/lend-withdraw`
- ✅ Earn page shows 3 sub-tabs with realistic mock data
- ✅ Staking tab: 3 validator pools, 1 with staked position (100 STRK, 1.23 rewards)
- ✅ DCA tab: 2 orders (STRK→ETH active, USDC→STRK indexing)
- ✅ Lending tab: 2 markets (USDC 4.2%, ETH 3.1%), 1 with 500 USDC deposited
- ✅ Stake flow: enter amount → review → mock stake → done → tx in history
- ✅ Claim flow: shows rewards → claim → done → tx in history
- ✅ DCA create flow: select pair → enter budget → pick frequency → review → done → tx in history
- ✅ Lend deposit flow: enter amount → review → mock deposit → done → tx in history
- ✅ Lend withdraw flow: enter amount → withdraw all shortcut → review → done → tx in history
- ✅ New tx records appear in home page activity feed with correct type icons/labels
- ✅ TabBar has 6 tabs with Earn tab highlighted on earn/* routes
- ✅ All components use "use client" directive
- ✅ Dark theme consistent with app design system

### Notes for Next Categories
- All earn operations are fully mocked — no real Starknet contract calls
- Mock data uses realistic APYs (3-5%) and amounts
- Earn store is Zustand-only (no localStorage persistence for positions)
- Transaction records persist via existing txHistory localStorage mechanism
- Staking positions reset on page reload (mock module state, not persisted)
- DCA per-cycle amount calculated over a 30-day period
- calcNetBalances in groups module remains correct (no modifications)
