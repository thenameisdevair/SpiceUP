# Set Live Frontend Brief

## 1. Feature Summary

This redesign covers the launch-critical SpiceUP web app experience: landing, authentication, home, money movement, groups, activity, and settings. It is for friend groups splitting bills and diaspora remittance users who need the product to feel attractive immediately, simple while in use, and memorable enough to return to.

The current UI already contains meaningful flows, but it still reads like a polished demo. The redesign should turn it into a trustworthy, emotionally magnetic financial product with clearer information architecture, cleaner task flows, and a more distinctive dual-theme visual system.

## 2. Primary User Action

The single most important thing the redesign should accomplish is this:

Help a new or returning user quickly trust the product enough to move money or settle a shared expense without hesitation.

## 3. Design Direction

Use the project design context from `.impeccable.md`.

The product should feel high-energy, rewarding, and emotionally sticky, borrowing the environmental pull of casino-inspired color psychology without becoming manipulative, chaotic, or gimmicky. The experience should feel premium, cinematic, and action-oriented in dark mode, while light mode should preserve the same confidence and reward energy in a brighter, cleaner expression.

This should not look like:

- a generic shadcn dashboard
- a cold corporate banking product
- a chaotic crypto casino
- a typical neon fintech landing page

## 4. Layout Strategy

### Overall Architecture

Reorganize the app around user jobs instead of feature buckets.

Recommended primary navigation:

- Home
- Move Money
- Groups
- Activity
- Settings

`Earn` should not occupy primary attention unless it is confirmed launch-ready.

### Home

Home should become the emotional anchor of the product.

It should emphasize:

- what the user can do right now
- current money position without fake portfolio theatrics
- recent relevant activity
- clear primary actions
- trust signals and system state

Avoid over-carded dashboard patterns. Use hierarchy, framing, and rhythm rather than stacking every concept inside identical panels.

### Money Movement

Send, receive, fund, and withdraw should feel like one unified operating surface rather than isolated flows. The design should reduce decision fatigue and make each step feel legible, especially around recipient, amount, network/privacy mode, confirmation, and status.

### Groups

Groups should prioritize social clarity:

- who is involved
- who owes what
- what needs attention next
- how to settle quickly

The list view should feel alive and useful even before entering a group.

### Settings

Settings should move away from a raw technical dump and toward an identity-and-safety center. Sensitive information should be disclosed carefully, with stronger hierarchy around account state, network state, privacy state, and support/help.

## 5. Key States

### Authentication

- first visit
- email entry
- social sign-in option
- loading/auth handoff
- invalid input
- success/redirect
- logged-out return visit

What the user needs:

- trust immediately
- minimal friction
- a clear sense of what the product does and why it is worth continuing

### Home

- first-time empty state
- returning user with balances
- user with no activity
- pending/confidential state
- sync/loading state
- degraded/error state

What the user needs:

- immediate orientation
- confidence in system truth
- obvious next actions

### Move Money

- empty form
- recipient validation
- insufficient balance
- review state
- pending/submitting
- success
- failed

What the user needs:

- clarity before commitment
- strong confirmation language
- confidence about what happens next

### Groups

- no groups
- groups list with active balances
- group detail with unsettled expenses
- settlement ready state
- loading/syncing
- error/degraded state

What the user needs:

- social context
- fast comprehension of what is owed
- one clear next action

### Settings

- identity visible
- sensitive details hidden by default
- network clearly stated
- session/account recovery paths
- logout flow

What the user needs:

- control
- confidence
- safety

## 6. Interaction Model

- Primary actions should be visually decisive and easy to find.
- Secondary actions should still feel intentional, not ghosted into irrelevance.
- Motion should reward transitions between input, review, pending, and completion.
- Sensitive actions should reveal detail progressively instead of dumping everything at once.
- Empty states should teach the next step, not just announce absence.
- Transaction and settlement flows should surface progress in a way that lowers anxiety rather than adding suspense.

## 7. Content Requirements

### Core Copy Needs

- clearer auth value proposition
- better money-movement microcopy
- system-state labels for pending, submitted, failed, confirmed
- group empty states that encourage setup
- settings copy that explains privacy and identity in plain language
- language that distinguishes estimated, available, pending, and private values correctly

### Content Reality Rules

- do not invent balances or prices
- do not imply completion when the system is still pending
- do not rely on crypto-native jargon without explanation
- do not overclaim privacy or security beyond what is actually implemented

## 8. Recommended References

Use these impeccable references during implementation:

- `spatial-design.md`
- `typography.md`
- `color-and-contrast.md`
- `interaction-design.md`
- `motion-design.md`
- `responsive-design.md`
- `ux-writing.md`

## 9. Open Questions

- Should dark mode be the default first-load theme, or should theme follow system preference initially?
- Which launch-critical features are definitely in scope for v1: only send/receive/groups, or also selected earn surfaces?
- What brand name treatment should the redesign preserve or evolve from the current SpiceUP wordmark approach?
