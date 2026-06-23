## Goal

Rework SMS auto-import so nothing lands in **Transactions** until the user confirms it from the **SMS Inbox**. The inbox flags possible duplicates using the same rule statement import uses (same date + same amount, ignoring decimals), is reachable directly from the main navigation, and keeps a "Deleted SMS" archive in settings.

## New flow

```text
SMS arrives ──► parsed + AI extracted ──► saved as "pending" in SMS Inbox
                                                  │
   ┌──────────────────────────────────────────────┤
   │ Inbox marks each pending row with a badge:   │
   │   • "Possible duplicate of <txn> on <date>"  │
   │     when an existing transaction has the     │
   │     same date and same integer amount        │
   │   • otherwise no badge                       │
   └──────────────────────────────────────────────┘
                  │
        Confirm ──┼── Delete ──► moves to Deleted SMS (Settings)
                  ▼
        inserted into Transactions
```

Unconfirmed rows stay in the inbox forever. Every time the inbox opens it re-runs the duplicate check against the current `transactions` list, so a manual entry added later instantly flips a pending row to "Possible duplicate".

## Changes

### 1. Data model

New table `public.sms_pending`:
- `user_id`, `sms_hash` (unique per user), `sms_sender`, `sms_raw`, `occurred_at`
- `parsed_date`, `parsed_amount`, `parsed_type`, `suggested_description`, `suggested_category_id`, `suggested_account_id`
- `status` text: `'pending' | 'deleted'` (default `pending`)
- `created_at`, `updated_at`
- RLS scoped to `auth.uid()`, GRANTs for `authenticated` + `service_role`.

`sms_ingested` (lightweight ledger of every SMS hash already processed, so we never re-evaluate the same SMS even after deletion):
- `user_id`, `sms_hash` unique per user, `created_at`. Same RLS + GRANTs.

No change to `transactions`.

### 2. SMS import pipeline (`src/hooks/useSmsImport.tsx`)

- `scanInbox` and the live listener no longer call `addTransactions`.
- For each new SMS (hash not in `sms_ingested`):
  1. Run AI extract as today.
  2. Insert a row into `sms_pending` with status `pending` and the AI-suggested fields.
  3. Insert the hash into `sms_ingested`.
- Expose `pending`, `confirmPending(id)`, `confirmMany(ids)`, `deletePending(id)`, `deleteMany(ids)`, `restorePending(id)`, `purgeDeleted(id|all)`, `recheckDuplicates()`.
- `confirmPending` inserts a single transaction via `addTransactions` then removes the pending row.
- A `duplicateOf` is computed on the client (not stored) so it always reflects the live transactions list.

### 3. Duplicate rule (matches statement import)

```ts
const sameDate = t.date.slice(0,10) === pending.parsed_date;
const sameAmount = Math.floor(t.amount) === Math.floor(pending.parsed_amount);
// type ignored per user request (date + amount only)
```

Returns the matching transaction id for the badge tooltip. Account is intentionally not compared.

### 4. SMS Inbox page (`src/pages/SmsReview.tsx`)

- On mount and whenever `transactions` changes, recompute duplicate flags for each pending row (no DB write).
- Sections:
  - **Possible duplicates** (yellow `Duplicate` badge, tooltip "Same date and amount as <description> on <date>")
  - **New from SMS** (no badge)
- Per-row actions: **Confirm** (primary), **Edit** (opens TransactionDialog seeded with the suggestion; saving = confirm with edits), **Delete** (moves to Deleted SMS).
- Bulk bar: Confirm selected · Delete selected · Change category · Change account.
- Footer count: "X new · Y possible duplicates".
- Remove the old "Mark reviewed" / `smsReviewed` UI — confirmation is the new signal.

### 5. Deleted SMS archive (Settings → SMS Auto-Import)

Inside `src/pages/settings/SmsSettings.tsx` add a collapsible "Deleted SMS" section listing rows where `status = 'deleted'` with **Restore** and **Delete permanently** actions, plus **Empty trash**.

### 6. Navigation

Add **SMS Inbox** as a top-level destination next to Transactions:
- `src/components/layout/BottomNav.tsx`: insert `{ label: 'SMS', path: '/sms-review', icon: MessageSquare }` next to Transactions (keep total at 6; swap Settings off the bottom bar is out of scope — instead replace AI Chat or Upload? **Decision:** keep all existing items, push SMS in as the 7th — bottom nav already uses `justify-around` and fits on phones; if it overflows, drop the label-only `Settings` icon since `/settings` is still reachable from the sidebar and from a header link). Final order: Dashboard · Transactions · **SMS** · Upload · AI Chat · Analytics · Settings (will verify on device width).
- `src/components/layout/Sidebar.tsx`: add the same entry under Transactions.
- Existing route `/sms-review` is already registered.

### 7. Cleanup

- Drop the in-memory `existingHashSet` duplicate filter in `useSmsImport` (now handled by `sms_ingested` + per-row duplicate badge).
- Remove `smsReviewed` UI references in `SmsReview.tsx` (column on `transactions` stays for back-compat; not used).
- Remove "Scan now creates transactions" wording from `SmsSettings.tsx`; replace with "New SMS appear in your SMS Inbox for review".

## Out of scope

- No change to AI extract, account identifiers, credit-skipping, manual-entry duplicate warning, or Android permission flow.
- No schema change to `transactions`.
- No backfill of historical SMS already imported as transactions.

## Technical notes

- Two migrations (`sms_pending`, `sms_ingested`) with `CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY`.
- `useSmsImport` exposes pending state via Supabase realtime subscription on `sms_pending` so the inbox badge count stays live.
- `confirmPending` calls existing `addTransactions([...])`; success → `delete from sms_pending where id = ?`.
- `deletePending` flips `status` to `'deleted'` (kept for the archive); `purgeDeleted` hard-deletes.
- Duplicate match runs client-side over `transactions` already loaded in `ExpenseContext` — O(n·m) is fine at user scale.
