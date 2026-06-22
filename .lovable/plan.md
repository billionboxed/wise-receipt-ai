
# SMS Expense Auto-Import — Plan

Add an opt-in feature that reads bank/card SMS on Android, auto-creates expenses tagged as `sms`, and lets users review/correct them in bulk. iOS and web stay on manual + statement upload (iOS does not allow SMS access — non-negotiable platform limit).

## 1. Source tracking (data model)

Every transaction gets a `source` field with one of: `manual`, `upload`, `sms`, `recurring` (recurring already exists implicitly via `recurring_expense_id`).

- DB migration: add `source TEXT NOT NULL DEFAULT 'manual'` to `transactions`, plus optional `sms_raw TEXT` and `sms_sender TEXT` for audit/debug on SMS-origin rows.
- Backfill: existing rows → `manual` (or `upload` if we can infer from `ai_suggested = true` + no `recurring_expense_id`; safer to leave as `manual` and only tag new ones going forward).
- All insert paths set `source` explicitly:
  - `TransactionDialog` → `manual`
  - `TransactionReview` (statement upload) → `upload`
  - `process-recurring-expenses` edge function → `recurring`
  - New SMS pipeline → `sms`

## 2. UX: showing the source

- **Transaction list row**: tiny icon left of the description — `Pencil` (manual), `FileText` (upload), `MessageSquare` (sms), `Repeat` (recurring). Monochrome, muted color, same size as existing meta icons.
- **Transaction list filter**: new chip group "Source: All / Manual / Upload / SMS / Recurring" alongside existing date/category filters.
- **Transaction detail / edit drawer**: a small "Source" row near the date showing the icon + label. For SMS rows, expand to show original sender + raw SMS text (read-only, collapsible).
- **Dashboard**: no change to totals (SMS rows count like any other expense). Add a subtle "X new from SMS this week" stat card only if SMS is enabled.

## 3. SMS opt-in & permission flow (Android native)

New Settings page `src/pages/settings/SmsSettings.tsx`:

1. Toggle "Auto-import from SMS" (off by default).
2. On enable → request `READ_SMS` + `RECEIVE_SMS` runtime permission via a Capacitor SMS plugin. If denied, show how to enable in system settings; revert toggle.
3. After grant → background scan of last 90 days of SMS, run sender+keyword filter, show "Found N likely transaction SMS from these senders" with a sender allowlist screen (checkboxes pre-checked for known banks). User confirms.
4. Import the matched SMS as confirmed transactions tagged `source: sms`, AI-categorize via the existing `categorize-transactions` edge function in batch.
5. From then on, a foreground/background listener picks up new SMS in real time and creates transactions silently (auto-confirm per user's choice).

Settings page also shows:
- Watched senders list (add/remove)
- "Re-scan last 30 days" button
- Disable toggle (stops listener, leaves existing SMS-tagged transactions in place)

## 4. Parser pipeline

A single shared parser used by both initial scan and live listener:

1. **Sender filter** — only senders on the user's allowlist (seeded with a built-in list of common bank/card sender IDs, region-aware; user can extend).
2. **Keyword filter** — must contain a debit/credit verb (`debited`, `spent`, `paid`, `purchase`, `withdrawn`, `credited`, `refund`) AND a currency amount (regex per locale).
3. **Reject** OTPs (`OTP`, `one-time`, `do not share`), balance alerts without txn, promos.
4. **Extract** amount, type (debit/credit), date (SMS timestamp), merchant guess (text after `at` / `to` / `from`), last-4 card digits if present.
5. **AI enrich** — send batch to `categorize-transactions` for category + tag suggestions. Account matching: try card-last-4 → account mapping the user sets in Accounts settings; fallback to a default "SMS Inbox" account the user picks in step-3 onboarding.
6. **Dedupe** — hash on `(amount, date±2min, sender, last4)`; skip if duplicate of an existing transaction (covers overlap with statement upload).
7. **Insert** as `source: sms`, `status: confirmed`, `ai_suggested: true`.

## 5. Bulk review & correction

New page `src/pages/SmsReview.tsx` (linked from Settings > SMS and from a "Review SMS imports" button on the dashboard when there are recent SMS rows):

- Lists all `source = 'sms'` transactions, sorted newest first, with date-range filter.
- Multi-select via long-press (reuses existing TransactionList swipe/select logic).
- Bulk actions: change category, change account, add tags, delete, mark reviewed.
- Per-row inline edit (tap to open existing TransactionDialog with source locked).
- A "Reviewed" flag (`sms_reviewed BOOLEAN DEFAULT false`) so users can hide already-checked rows. Unreviewed rows show a subtle dot indicator in the main transaction list.

## 6. Native build (Capacitor)

SMS access requires native — no web fallback.

- Add Capacitor (already configured per `capacitor.config.ts` — `appId: app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa`). Confirm Android platform added.
- Add an SMS plugin. Options: `capacitor-sms-inbox` (read) + `cap-plugin-sms-retriever` or a small custom plugin for `BroadcastReceiver` on `SMS_RECEIVED`. We will use community plugin `@byteowls/capacitor-sms` style + a thin custom Android module for the receiver if needed.
- AndroidManifest additions: `READ_SMS`, `RECEIVE_SMS` permissions, `<receiver>` for `SMS_RECEIVED` broadcast.
- Platform gate in UI: `Capacitor.getPlatform() === 'android'` → show SMS settings; otherwise hide the toggle and show a short "Available on Android only" note.
- Play Store note: Google restricts `READ_SMS` apps; we'll need to submit a Permissions Declaration explaining the expense-tracking use case. Flag this to user before submission.

iOS: the SMS settings entry is hidden. No code path attempts SMS access.

## 7. Distinction summary (per user request)

| Source | How it lands | Status | Badge | Reviewable |
|---|---|---|---|---|
| Manual | TransactionDialog | confirmed | pencil | n/a |
| Upload | Statement parse → review screen | confirmed after user OK | file | already reviewed at import |
| SMS | Auto from inbox listener | confirmed, `sms_reviewed=false` | message | yes — SMS Review page + dot indicator |
| Recurring | pg_cron at 6AM UTC | confirmed | repeat | edit anytime |

---

## Technical details

**DB migration**
```sql
ALTER TABLE public.transactions
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','upload','sms','recurring')),
  ADD COLUMN sms_sender TEXT,
  ADD COLUMN sms_raw TEXT,
  ADD COLUMN sms_reviewed BOOLEAN NOT NULL DEFAULT true;
-- new SMS rows insert sms_reviewed=false explicitly
CREATE INDEX idx_transactions_source ON public.transactions(user_id, source);
```
New table `sms_sender_allowlist (user_id, sender, enabled)` with standard RLS + GRANTs.
Optional `account_card_map (user_id, account_id, last4)` for card→account routing.

**Files to add**
- `src/pages/settings/SmsSettings.tsx`
- `src/pages/SmsReview.tsx`
- `src/lib/sms/parser.ts` (pure TS, unit-testable)
- `src/lib/sms/senders.ts` (default allowlist)
- `src/lib/sms/native.ts` (Capacitor bridge, no-op on non-Android)
- `src/hooks/useSmsImport.tsx`
- Android: `android/app/src/main/java/.../SmsReceiver.java` + manifest entries

**Files to edit**
- `src/hooks/useExpenseData.tsx` — propagate `source`, `sms_*` fields
- `src/components/transactions/TransactionList.tsx` — source icon + filter chip
- `src/components/transactions/TransactionDialog.tsx` — show source row, SMS raw collapsible
- `src/components/layout/Sidebar.tsx` + `BottomNav.tsx` — link to SMS settings (Android only)
- `capacitor.config.ts` / Android manifest — permissions + receiver

**Edge function reuse**
- `categorize-transactions` for batch category/tag suggestions on SMS imports — no new function needed.

**Edge cases**
- Refunds (`credited`, `refund`) → set `type: credit` (matches existing credit-handling memory).
- SMS for already-uploaded statement transactions → dedupe by `(amount, date±2min, last4)`.
- User disables SMS → listener stops; historical SMS-tagged transactions stay; settings page warns before disabling.
- Permission revoked from system settings → app detects on next launch, shows banner offering to re-enable.

## Out of scope (this plan)
- iOS email/SMS-forwarding fallback (rejected in clarifying Q1).
- Hybrid AI confidence routing (rejected in Q2 — always auto-confirm).
- Building the Android binary / Play Store submission itself — the plan stops at code + manifest; you run `npx cap sync` + Android Studio per existing mobile workflow memory.
