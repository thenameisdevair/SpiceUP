# Set Live PRD

## 1. Purpose

`Set Live` is the production-hardening program for SpiceUP.

The goal is to convert the current codebase from a strong demo/prototype into a live, dependable, user-safe product that can be deployed publicly as a web application.

This PRD covers two parallel outcomes:

1. Remove all demo, mock, placeholder, and hardcoded behavior that blocks real-world usage.
2. Rebuild the product experience and interface so the app feels coherent, trustworthy, and launch-ready.

---

## 2. Current State Summary

The current repository is a Next.js web application with meaningful product surface area already built:

- Auth pages and app-routed screens exist
- Core wallet-style flows exist
- Group expenses flows exist
- Earn/yield flows exist
- Prisma and Supabase wiring exist
- A design system and reusable UI components exist

The codebase is not a blank scaffold. It is a partially integrated product.

However, it still contains prototype-level seams that make it unsafe to launch as-is:

- Mock auth restoration is still active in the runtime flow
- Some data and wallet behavior are simulated or hardcoded
- Environment handling is incomplete for production operations
- Backend/API surface is underbuilt
- Deployment documentation is inconsistent with the actual app target
- The UI is visually cohesive in places, but the overall UX still reads as a demo rather than a production financial product

Conclusion:
Editing and hardening this codebase is the fastest path to launch, but only if the remaining demo assumptions are treated as first-class product debt and removed systematically.

---

## 3. Product Goal

SpiceUP should launch as a privacy-first financial product on Starknet that lets users:

- authenticate without seed-phrase friction
- hold and view balances confidently
- fund, send, receive, and withdraw assets reliably
- manage private or semi-private payment flows
- participate in group expense workflows
- interact with earn flows only when those flows are technically and legally ready

The live product must feel:

- trustworthy
- operationally real
- simple for non-crypto-native users
- visually distinctive
- safer than the current demo

---

## 4. Launch Principles

### 4.1 Reality Over Demo Polish

No feature should appear live if it still depends on mock state, fake balances, fake transactions, or local-only persistence pretending to be real product behavior.

### 4.2 Trust Before Breadth

If a feature is visually attractive but operationally unreliable, it should be cut, hidden behind a flag, or reduced in scope before launch.

### 4.3 One Coherent Product

Authentication, wallet state, transactions, support text, empty states, and settings must all feel like one product system, not a set of disconnected demos.

### 4.4 Launchable Web First

This repository should be treated as a Next.js production web app. Any older mobile-first documentation, architecture assumptions, or deployment notes must be reconciled or removed.

---

## 5. Scope

### In Scope

- removal of mock and hardcoded product behavior
- production-ready auth flow integration
- production-ready environment and secret handling
- cleanup of fake balances, fake history, and fake simulations where present
- backend/API restructuring for real product operations
- database and persistence hardening
- launch-safe routing and access guards
- UX rewrite and front-end redesign
- design system cleanup and token restructuring
- launch documentation and deployment path for web
- observability, error handling, and release gating

### Out of Scope for Initial Launch Unless Proven Ready

- any feature that still relies on unverified chain-side assumptions
- any yield flow without confirmed integrations, economics, and user disclosures
- advanced finance surfaces that increase legal or operational risk without clear launch justification
- mobile-native deployment planning unless a separate mobile repository or product track is defined

---

## 6. Demo-to-Live Conversion Requirements

### 6.1 Remove Mock Authentication

The live app must no longer rely on local mock sessions as the primary auth bootstrap path.

Current known risk:

- `src/hooks/useAuthInit.ts` restores session state from `src/lib/mockAuth.ts`

Requirements:

- replace mock bootstrap with real Privy session handling
- ensure authenticated state is derived from real provider/session state
- persist only the minimum safe user state needed client-side
- remove fake wallet identity generation from login-critical flows
- keep any mock utilities only for test/dev mode and isolate them from production runtime

Acceptance criteria:

- no production route depends on `mockAuth` for user identity
- refreshing the browser preserves only real authenticated state
- sign-in, sign-out, and re-entry work without local fake identity generation

### 6.2 Remove Hardcoded Financial Values

Known demo behavior likely includes:

- hardcoded portfolio valuation logic
- hardcoded network labels
- fixed token pricing assumptions
- simulated rollover timing
- locally manufactured balances or transaction states

Requirements:

- replace hardcoded pricing math with either real quote data or explicit non-price balance-only displays
- ensure balances are sourced from real wallet/backend state
- replace fake timers and simulated transaction steps with real pending/success/error state machines
- remove any "always available" or "always funded" assumptions

Acceptance criteria:

- no displayed financial value is computed from arbitrary constants unless clearly labeled as estimated and sourced
- no transaction status is simulated without real backing state

### 6.3 Remove Fake Transaction History

Requirements:

- transaction history must be sourced from real persisted records or real indexed activity
- records must distinguish pending, succeeded, failed, and unknown states
- private transactions must preserve privacy expectations while still giving users operational visibility

Acceptance criteria:

- history survives refresh and session changes appropriately
- users can understand what happened without the UI inventing events

### 6.4 Replace Placeholder API Surface

Current known issue:

- `src/app/api/route.ts` is still a basic hello-world route

Requirements:

- define a real backend surface for user profile sync, groups, transaction logging, health, and any required wallet-support operations
- remove unused placeholder routes
- add minimal health and readiness endpoints for deployment confidence

Acceptance criteria:

- backend routes correspond to real product use cases
- no placeholder API route remains in the production app

### 6.5 Normalize Environment and Network Handling

Requirements:

- define environment variable policy for local, preview, and production
- validate required environment variables at startup
- clearly separate mainnet-capable and testnet-only behavior
- ensure no production deployment defaults silently to sepolia without operator intent

Acceptance criteria:

- production startup fails loudly on missing critical env vars
- network mode is explicit in deployment configuration

### 6.6 Reconcile Deployment Documentation

Current known issue:

- existing deployment documentation references Expo/mobile distribution even though this repository is a Next.js web app

Requirements:

- replace or archive mobile-specific deployment notes
- write web deployment instructions for the actual hosting target
- document build, start, environment, database migration, and rollback steps

Acceptance criteria:

- a new engineer can deploy the web app from repo docs without guessing the product target

---

## 7. UX and Front-End Rebuild

This is not a cosmetic restyle. It is a structural redesign.

### 7.1 UX Goals

The interface must shift from "feature demo" to "financial operating surface."

The redesigned UX should:

- reduce uncertainty around money movement
- make privacy understandable without overexplaining cryptography
- make network state, pending state, and failure state visible
- simplify first-run onboarding
- make the product feel safe for a non-expert user
- reduce the number of screens and interactions that feel purely technical

### 7.2 IA Restructure

The app architecture should be reorganized around user jobs rather than feature categories.

Recommended top-level structure:

- Home
  - current balance state
  - recent activity
  - primary actions
- Move Money
  - fund
  - send
  - receive
  - withdraw
- Groups
  - groups list
  - settlements
  - create group
- Activity
  - all transaction and status history
- Settings
  - identity
  - network
  - privacy
  - support

`Earn` should be launch-gated:

- keep only if technically real, user-safe, and explained clearly
- otherwise move behind a feature flag or remove from launch navigation

### 7.3 Visual Direction Requirements

The redesign must feel distinctive and deliberate, not like a generic shadcn dashboard.

Requirements:

- replace current generic dark-fintech demo styling with a stronger brand system
- rebuild type hierarchy, spacing rhythm, and information density
- redesign empty, loading, error, and pending states as first-class states
- simplify action surfaces and reduce card repetition
- ensure mobile and desktop layouts each feel intentional rather than merely scaled versions of one another

### 7.4 Design System Requirements

Requirements:

- replace ad hoc color usage with a documented token system
- replace current font defaults with a brand-led font pairing
- unify components that currently exist in duplicate or mixed casing
- define spacing, radius, elevation, focus, and feedback rules centrally
- remove decorative patterns that weaken trust in a financial context

Acceptance criteria:

- the new UI can be described by a clear design language, not just "improved styling"
- component states are consistent across the app

---

## 8. Technical Restructuring Workstreams

### Workstream A: Auth and Identity

- remove runtime dependence on mock auth
- wire Privy session lifecycle end-to-end
- define user profile sync behavior with Supabase/Postgres
- handle loading, expired sessions, and recovery states safely

### Workstream B: Wallet and Transaction Truth

- audit all wallet, balance, send, receive, fund, and withdraw flows
- replace hardcoded or simulated values with real state
- define canonical transaction model and persistence path
- implement pending and reconciliation states

### Workstream C: Data and Backend

- define required API routes
- harden Supabase/Prisma usage
- validate schema against live use cases
- create migration and seed strategy for non-demo environments

### Workstream D: Front-End Redesign

- create design context and design brief
- rebuild navigation and information architecture
- rebuild visual system and shared primitives
- redesign home, auth, money movement, groups, activity, and settings flows

### Workstream E: Launch Operations

- deployment configuration
- environment management
- health checks
- error logging
- analytics and funnel visibility
- rollback and release checklist

---

## 9. Feature-by-Feature Launch Decisioning

### Must Be Live for v1

- real authentication
- real session restoration
- real balance display
- real send / receive / fund / withdraw flows, or clearly reduced set of these
- reliable transaction visibility
- working group expense core if retained in launch scope
- production deployment path

### Conditional for v1

- confidential transfer flows if full operational correctness is verified
- groups settlements if they depend on incomplete private-transfer plumbing

### Likely Post-Launch or Feature-Flagged

- staking
- lending
- DCA
- any advanced earn surface lacking production confirmation

---

## 10. Risks

### Product Risk

The app may currently promise more than it can safely execute. Launching broad financial functionality with partial mocks or partial integrations would damage trust immediately.

### Technical Risk

State may currently be split across local storage, Zustand, provider state, and database assumptions in ways that create divergence after refresh, failure, or account switching.

### Design Risk

A large visual rewrite without clarified brand direction may improve polish but still miss the right emotional tone for launch.

### Scope Risk

Trying to ship every current feature as live may delay launch significantly. Strategic feature cuts may be required.

---

## 11. Milestones

### Milestone 1: Truth Audit

- identify every mock, fake, simulated, and hardcoded product dependency
- tag each as remove, replace, or feature-flag

### Milestone 2: Product Core Live Path

- finalize auth, data, env, and transaction truth
- define minimum launch scope

### Milestone 3: UX and Design Rebuild

- complete design context
- complete design brief
- rebuild the primary user flows

### Milestone 4: Production Readiness

- deployment docs
- environment validation
- monitoring
- QA checklist
- release candidate

---

## 12. Success Metrics

The project is considered "set live" when:

- the app no longer depends on demo/mock runtime paths for core behavior
- a real user can authenticate and return safely
- balances and transactions reflect truthful system state
- launch-scoped money flows work reliably
- deployment to a production web environment is documented and repeatable
- the UI/UX feels like a deliberate product, not a prototype

---

## 13. Immediate Next Actions

1. Run a repo-wide audit for mock, fake, seeded, placeholder, and hardcoded logic.
2. Define the minimum launch feature set and explicitly cut or flag anything not ready.
3. Replace auth bootstrap with real provider-backed session logic.
4. Create design context for the front-end rebuild and write `.impeccable.md`.
5. Produce a front-end design brief for the new information architecture and visual system.
6. Rebuild the launch-critical screens first: auth, home, send/receive, activity, settings.
7. Add web deployment and operational readiness documentation.

---

## 14. Notes on Tooling

The requested `npx skills add pbakaus/impeccable` command could not run in this environment because `npx` is not installed in the current shell.

A local `impeccable` skill is already present in the repository and can be used for the redesign workflow once design context is confirmed.
