## Goal

Remove the "Watch senders" feature entirely. SMS filtering is now driven solely by:
1. Built-in bank-sender heuristic (to identify which SMS to parse at all)
2. Account identifiers (to decide which SMS to import and which account they belong to)

## Changes

### 1. SMS Settings UI (`src/pages/settings/SmsSettings.tsx`)
- Remove the "Watch senders" section: the senders list, add/remove inputs, and the "Discover senders" button.
- Keep: enable toggle, default account, scan-now button, and add a short note pointing users to **Accounts → SMS identifiers** as the way to control what gets imported.

### 2. Hook (`src/hooks/useSmsImport.tsx`)
- Drop `allowlist` state, `addSender`, `toggleSender`, `removeSender`, and `discoverSenders` from the public API.
- Remove the `sms_sender_allowlist` query from `loadAll`.
- In `scanInbox` and the live listener, drop the `enabledSenders` set; keep only the `isLikelyBankSender` heuristic + identifier substring check.

### 3. Database migration
- Drop table `public.sms_sender_allowlist` (and its policies, cascading).

### 4. Cleanup
- Remove any imports / references to the removed APIs elsewhere (search for `allowlist`, `addSender`, `discoverSenders`, `sms_sender_allowlist`).

## Out of scope
- No change to account identifiers, AI parsing, or credits-skipping logic.
- No change to native Android SMS permissions.
