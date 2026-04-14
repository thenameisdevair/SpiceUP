# SpiceUP

SpiceUP is a privacy-first Starknet web app for two core jobs:

- splitting bills with friends and groups
- supporting remittance-style money movement for diaspora users

The project started as a prototype and has been pushed toward a live, deployable web product. It now runs as a Next.js application with real database-backed APIs, Privy-based authentication, Supabase Postgres via Prisma, and a Vercel-friendly deployment setup.

## What It Does

SpiceUP currently focuses on:

- passwordless user authentication with Privy
- a dark-mode-first consumer finance interface
- wallet-style flows for funding, sending, receiving, and withdrawing
- group expense creation, tracking, and settlement
- persisted transaction history
- Starknet network-aware configuration
- launch-oriented deployment for the web

The product language and UX are designed around trust, clarity, privacy, and reducing seed-phrase-style friction for non-expert users.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma
- Supabase Postgres
- Privy
- React Query
- Zustand
- Vercel

## Repository Structure

High-signal folders:

- `src/app` - App Router pages and API routes
- `src/app/api` - server endpoints for health, user sync, groups, expenses, settlements, and transactions
- `src/components` - reusable UI primitives and product components
- `src/hooks` - app-facing hooks for auth, groups, balances, and transaction flows
- `src/lib` - shared business logic, env handling, DB wiring, auth helpers, and server-side serializers
- `src/providers` - theme, query, and auth providers
- `src/stores` - Zustand client state
- `prisma` - Prisma schema and database model definitions
- `upload` - product docs including the Set Live PRD

## Core Product Areas

### Authentication

SpiceUP uses Privy for user auth and identity bootstrapping. The server-side auth layer validates Privy tokens and upserts app users into Postgres.

Relevant files:

- `src/providers/PrivyProvider.tsx`
- `src/lib/server-auth.ts`
- `src/app/api/users/sync/route.ts`

### Groups and Bill Splitting

The app supports creating groups, adding expenses, splitting totals, and generating settlement relationships between members.

Relevant files:

- `src/app/api/groups/route.ts`
- `src/app/api/groups/[id]/expenses/route.ts`
- `src/app/api/groups/[id]/settlements/route.ts`
- `src/lib/server-groups.ts`
- `prisma/schema.prisma`

### Activity and Transaction Persistence

Transaction records are stored in the database and returned through API routes rather than being generated as fake local demo history.

Relevant files:

- `src/app/api/transactions/route.ts`
- `src/hooks/useTransactionHistory.ts`
- `prisma/schema.prisma`

### Network and Chain Configuration

The app can be configured for Starknet Sepolia or Mainnet through environment variables. RPC overrides are supported for both environments.

Relevant files:

- `src/constants/network.ts`
- `src/lib/env.ts`

## API Surface

Current app-facing routes include:

- `GET /api`
  Returns a simple health payload with service status, active network, and timestamp.

- `POST /api/users/sync`
  Validates/authenticates the current user and syncs their profile into the database.

- `GET /api/groups`
  Returns groups related to the current user.

- `POST /api/groups`
  Creates a group and seeds its members.

- `POST /api/groups/:id/expenses`
  Creates a group expense.

- `GET /api/groups/:id/settlements`
  Returns settlement data for a group.

- `GET /api/transactions`
  Returns persisted transaction history for the current user.

- `POST /api/transactions`
  Creates a persisted transaction record.

- `DELETE /api/transactions`
  Clears the current user’s transaction history.

## Database Model

The Prisma schema includes four main areas:

- `User`
  App user identity, Privy linkage, optional contact metadata, and wallet metadata.

- `Group` and `GroupMember`
  Group ownership and membership relationships.

- `Expense`, `ExpenseSplit`, and `Settlement`
  Bill-splitting and settlement data.

- `Transaction`
  Persisted user activity across send, receive, fund, withdraw, staking, lending, and related flows.

The schema is defined in [`prisma/schema.prisma`](./prisma/schema.prisma).

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

Required:

- `DATABASE_URL`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional or deployment-specific:

- `NEXT_PUBLIC_NETWORK`
- `NEXT_PUBLIC_AVNU_API_KEY`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_RPC_URL_SEPOLIA`
- `NEXT_PUBLIC_RPC_URL_MAINNET`

### Supabase Connection Note

For environments that need IPv4-safe Postgres access, use the Supabase pooler-style connection string instead of the direct database hostname.

The example file already reflects the pooler pattern:

`postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-1-YOUR_REGION.pooler.supabase.com:5432/postgres?sslmode=require`

## Local Development

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Generate Prisma client if needed:

```bash
npm run db:generate
```

Push the schema to the configured database:

```bash
npm run db:push
```

Start the development server:

```bash
npm run dev
```

## Production Build

Build the app:

```bash
npm run build
```

Start the standalone server:

```bash
npm run start
```

Production builds use Webpack rather than Turbopack at the moment. This was chosen intentionally to avoid browser/runtime issues encountered with the Turbopack production client bundle during deployment.

## Vercel Deployment

This repository is already structured for Vercel deployment.

Key deployment files:

- `vercel.json`
- `next.config.ts`
- `package.json`

### Recommended Deploy Flow

1. Import the GitHub repository into Vercel.
2. Set the production branch to `main`.
3. Add the required environment variables in the Vercel project settings.
4. Deploy.

### Important Vercel Notes

- `vercel.json` explicitly sets the framework to `nextjs`.
- The build command is pinned to `next build --webpack`.
- `next.config.ts` pins the project root so hosted builds do not infer the wrong workspace root.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:generate
npm run db:migrate
npm run db:reset
```

## Current Product State

This repo is no longer just a visual demo, but it is also not a finished end-state financial product.

The current codebase already includes:

- real database-backed API routes
- authenticated user sync
- group data persistence
- persisted activity history
- launch-focused web deployment configuration

There are still areas that should be treated carefully before broader production rollout:

- some financial flows still need final chain-side validation and operational hardening
- earn-related surfaces should only be exposed when their underlying integrations are truly live and policy-safe
- fonts are still loaded through `next/font/google`, which means local production builds need outbound network access during the build step
- the current architecture assumes a web-first deployment path, not Expo/mobile deployment

## Product Docs

Internal product documentation included in this repo:

- [upload/SET_LIVE_PRD.md](./upload/SET_LIVE_PRD.md)
- [upload/SET_LIVE_FRONTEND_BRIEF.md](./upload/SET_LIVE_FRONTEND_BRIEF.md)

These documents describe the move from prototype to live product, including UX direction, trust requirements, and demo-to-production cleanup.

## Security Notes

- `.env` is intentionally not committed.
- Never commit live credentials, API keys, database URLs, or auth secrets.
- If any token or secret has ever been pasted into a chat, terminal log, or commit, rotate it.

## Contributing

If you are extending the app, keep these constraints in mind:

- prefer real persistence over local mock state
- do not reintroduce demo-only placeholder APIs
- keep network behavior explicit
- treat privacy and money movement UI as trust-critical
- preserve the dark-mode-first design direction unless there is a deliberate product decision to change it

## License

No license file is currently included in this repository. Add one before distributing the project more broadly.
