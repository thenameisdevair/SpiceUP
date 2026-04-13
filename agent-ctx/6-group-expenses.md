# Task 6 — Category 5: Group Expenses

**Status**: ✅ Complete
**Date**: 2025-04-13

## Summary

Built the complete Group Expenses feature for SpiceUP including:
- Groups data module with types and `calcNetBalances` pure function
- Zustand store for groups/expenses/settlements state
- 2 React hooks (`useGroups`, `useGroupExpenses`)
- 2 shared components (`GroupCard`, `ExpenseItem`)
- 4 page routes (Groups List, New Group, Group Detail, Add Expense)
- Settlement modal (inline in group detail)
- 2 mock groups with correct net balance calculations

## Files Created (10)

1. `src/lib/groups.ts` — Types, calcNetBalances algorithm, mock data
2. `src/stores/groups.ts` — Zustand store
3. `src/hooks/useGroups.ts` — Groups list hook
4. `src/hooks/useGroupExpenses.ts` — Per-group expenses hook
5. `src/components/GroupCard.tsx` — Group card component
6. `src/components/ExpenseItem.tsx` — Expense item component
7. `src/app/(app)/groups/page.tsx` — Groups list page
8. `src/app/(app)/groups/new/page.tsx` — New group page
9. `src/app/(app)/groups/[id]/page.tsx` — Group detail page
10. `src/app/(app)/groups/[id]/add-expense/page.tsx` — Add expense page

## Files Modified (0)

No existing files were modified.

## Key Design Decisions

- `calcNetBalances` uses greedy creditor/debtor matching (O(n log n)) with floating-point safety
- Settlements are stored in Zustand and recalculated reactively via `useMemo`
- Custom split mode allows arbitrary amounts with live total validation
- All data is mock (no API calls, no localStorage persistence for groups)
- Stage machines for New Group (3 stages) and Add Expense (3 stages)

## Verification

- `bun run lint`: ✅ 0 errors
- Net balance math verified: Dinner Squad → Bob owes You $14, Bob owes Alice $2; Trip Fund → Carol/Dave/Eve each owe You $100
