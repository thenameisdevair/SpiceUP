# Task 4 — Category 3: Core Wallet Layer

**Status**: ✅ Complete

## Summary

Built the complete core wallet layer for SpiceUP. All 12 files created, 2 files modified, 0 lint errors.

## Files Created (12)

### Library Modules
1. `src/lib/txHistory.ts` — Transaction history localStorage module (TxRecord type, CRUD, 200 cap)
2. `src/lib/format.ts` — Format utilities (formatBalance, shortenAddress, toFiat, formatUsdValue, formatTimestamp)

### Hooks
3. `src/hooks/useBalance.ts` — Mock balance hook (ETH/STRK/USDC, 15s polling, ±1% variation)
4. `src/hooks/useConfidentialBalance.ts` — Mock Tongo confidential balance (2.5 STRK, pending, nonce)
5. `src/hooks/useTransactionHistory.ts` — Tx history hook with 6 sample records, recordTx, clearAll

### UI Components
6. `src/components/BalanceCard.tsx` — Token balance card with eye toggle, skeleton loading
7. `src/components/ConfidentialBalanceCard.tsx` — ZK balance card with Fund/Withdraw, rollover
8. `src/components/TransactionItem.tsx` — Tx row with directional icons, private badge, timestamps
9. `src/components/AmountInput.tsx` — Numeric input with TokenSelector, MAX button, validation
10. `src/components/TokenSelector.tsx` — Horizontal token picker chips (ETH/STRK/USDC)

### Pages
11. `src/app/(app)/receive/page.tsx` — Receive page with QRCodeSVG, public/private toggle, copy
12. `src/app/(app)/send/page.tsx` — Send page with 4-stage state machine (input→review→sending→done)

## Files Modified (2)
1. `src/app/(app)/home/page.tsx` — Full redesign: balance cards, confidential card, tx history, skeletons
2. `src/components/TabBar.tsx` — 5 tabs: Home, Send, Receive, Groups, Settings

## Key Design Decisions
- Used `useState(() => initializeTxHistory())` lazy initializer to avoid React strict mode lint errors
- 5-tab layout instead of 4+overlay to keep all core wallet actions always accessible
- Framer-motion staggered animations on balance cards and transaction list
- Color-coded tokens: ETH=blue, STRK=purple, USDC=green
