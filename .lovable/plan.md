## Goal

Every SMS that gets imported (both bulk inbox scans and the live foreground listener) flows through a new AI extraction step. The AI returns a clean, well-described transaction with the best-matching category and account picked from the user's existing lists. The current regex parser stays only as a cheap pre-filter to skip OTP/promo SMS before spending AI credits.

## New edge function: `parse-sms-transactions`

- Model: `google/gemini-3-flash-preview` via the Lovable AI Gateway helper pattern already used by `categorize-transactions` and `parse-image-transactions`.
- Input: `{ messages: [{ id, sender, body, occurredAt }], categories: [{id, combined}], accounts: [{id, name, last4?}], currency }`.
- Output (structured tool-call schema, one entry per parsable SMS):
  ```
  { id, isTransaction, amount, type: 'debit'|'credit',
    date (ISO yyyy-mm-dd), merchant, description,
    categoryId, accountId, confidence: 0..1, reason }
  ```
- Prompt rules:
  - Skip OTPs, promos, balance-only alerts, future-debit notices (`isTransaction:false`).
  - Pick the closest existing `categoryId` — never invent new ones; fall back to `null` only if nothing fits.
  - Match `accountId` using card last-4 or bank/account hints in the SMS; otherwise `null`.
  - `description` may be rewritten for clarity (e.g. "Swiggy order" instead of `SWIGGY*BLR`), but must stay faithful to the SMS.
  - Inject current year when the SMS date is ambiguous (same rule as image parsing).
- Batched: accept up to ~25 SMS per call to keep credits/latency reasonable; split larger batches client-side.

## Client wiring (`src/hooks/useSmsImport.tsx`)

1. Keep `parseSmsBatch` as a *pre-filter only*: drop OTP/promo SMS and produce `(sender, body, occurredAt, last4)` candidates plus a dedupe hash.
2. New helper `aiExtractSms(candidates)` calls the edge function with the user's current `categories` and `accounts` list, returns AI rows.
3. `scanInbox`:
   - read inbox → pre-filter → dedupe vs existing transactions
   - call `aiExtractSms` in chunks of 25
   - map results into `Omit<Transaction,'id'>` using AI's `categoryId`/`accountId` (fall back to `cardMap` lookup, then `prefs.defaultAccountId`)
   - mark `aiSuggested: true`, `smsReviewed: false`, `source: 'sms'`, store `smsRaw`
4. Live foreground listener: same pipeline but single-message AI call; debounce so multiple SMS within 2 s batch into one call.
5. Loading/toast: show "AI is reading X new SMS…" while the edge call is in-flight; surface 429/402 errors clearly.

## SMS Review page

No schema change needed. Add a small "AI" chip next to AI-rewritten descriptions, and an "Original SMS" expand (already present) so the user can verify what AI changed.

## Technical notes

- New file: `supabase/functions/parse-sms-transactions/index.ts` (CORS, JWT validated in code, validates body with Zod, structured output via AI SDK `Output.object`).
- New client helper: `src/lib/sms/aiExtract.ts` — wraps `supabase.functions.invoke('parse-sms-transactions', …)` and chunks by 25.
- Keep `findBestCategory` only as a last-resort fallback when AI returns `categoryId: null`.
- No DB migration required.
- No changes to native Android SMS reading or permissions.

## Out of scope

- Creating new categories/accounts automatically (AI only picks from existing).
- Re-processing already-imported SMS transactions retroactively (can add later as a "Re-run AI" button on SMS Review if you want).
