## Goal

1. Let the user attach **identifiers** (card last-4 digits, or any text hint like "HDFC", "ICICI Salary", "xx1234") to each account. AI uses these to decide which SMS belong to tracked accounts — SMS that don't match any tracked account's identifiers are skipped.
2. **Ignore all credit transactions** (refunds, salary, cashback, money received). Expense tracker = debits only.

## Changes

### 1. Account identifiers (replaces today's `account_card_map`)

Today `account_card_map` only stores a numeric `last4` per account. We'll extend it to free-form identifiers so users can add things like `HDFC`, `1234`, `Amazon Pay`, `ICICI-Sal`.

- DB migration: new table `account_sms_identifiers (id, user_id, account_id, identifier text, created_at)` with RLS + GRANTs. `last4` rows from `account_card_map` get auto-migrated into this table as identifiers, then we keep `account_card_map` for backwards compat but stop writing new rows from the UI.
- Settings UI: in **Settings → Accounts**, each account gets an "SMS identifiers" chips input — add/remove free-form strings (digits or text). Replaces the old "card last-4" field.

### 2. Pre-filter SMS by tracked identifiers

In `useSmsImport.scanInbox` and the live listener:
- Build the union of all account identifiers across tracked accounts.
- If the user has any identifiers configured, drop SMS bodies that don't contain at least one of them (case-insensitive substring). Senders that are explicitly allowlisted still pass through so onboarding/discovery still works.
- If no identifiers are configured, fall back to current behaviour (sender allowlist + bank-sender heuristic) so existing users aren't broken.

### 3. AI prompt: identifiers + debits-only

In `supabase/functions/parse-sms-transactions/index.ts`:
- Accept `accounts: [{ id, name, identifiers: string[] }]` instead of `last4`.
- Update system prompt:
  - "Match `accountId` only when the SMS body or sender contains one of that account's identifiers. If no identifier matches, set `accountId: null` AND `isTransaction: false` (we don't track unidentified accounts)."
  - "This is an **expense tracker**. Set `isTransaction: false` for any credit/refund/cashback/salary/money-received SMS. Only return `type: 'debit'` rows."
- Server-side guard: after AI returns, drop any row where `type !== 'debit'` or `accountId == null` (when the user has identifiers configured).

### 4. Client wiring (`useSmsImport.tsx`)

- Replace `cardMap` lookups with the new identifiers list.
- `toTransactionsAI` passes `accounts: [{id, name, identifiers}]` to the edge function.
- After AI returns, additionally filter out any `type === 'credit'` row as a safety net.
- Remove the credit-fallback path in the regex fallback too (skip non-debit).

### 5. Out of scope

- No retroactive cleanup of already-imported credit transactions (user can delete manually; we can add a one-click "Remove imported credits" later if wanted).
- No change to manual entry — credits can still be added manually; this only affects SMS auto-import.

## Technical notes

- Migration adds `account_sms_identifiers` with `(user_id, account_id, lower(identifier))` unique index, RLS policies (`auth.uid() = user_id`), and explicit GRANTs to `authenticated` + `service_role`.
- `AccountsSettings.tsx` gets a small chips editor per account (Enter to add, X to remove).
- Edge function input schema bumped; old `last4` field becomes optional/ignored.
- No change to Android permissions or native SMS reading.
