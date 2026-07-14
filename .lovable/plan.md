## Why it's happening

Dedupe relies on `sms_ingested.sms_hash`. There are **two different hashing schemes** in the codebase that both produce hashes for the same SMS:

- **Strict** (`parseSms`): `amount|minute|last4|sender|type`
- **Loose** (`parseSmsLoose`, used by the identifier pipeline): `sender|minute|body[0..120]`

These do not collide, so once we switched the identifier pipeline to the loose parser, every SMS that was previously ingested under a strict hash (or ingested on a device where the sender/body string differs even slightly between reads — trailing whitespace, casing, or the 120-char slice cut differently) shows up again. It reaches AI, becomes a `sms_pending` row, and — because a real transaction with the same date+amount already exists — is flagged as a "possible duplicate".

Also contributing: `confirmPending` deletes the pending row but never guarantees the hash is in `sms_ingested` for that row (it is only inserted at scan time in `persistPending`). If a rescan starts before the local `ingestedHashes` state is warm, or the original insert silently failed, confirmed items can leak back in.

## Fix (structural, not per-case)

1. **One canonical hash per SMS, computed from raw fields only** (sender + occurredAt-minute + full trimmed body). Put it in `src/lib/sms/parser.ts` as `smsHash(raw)` and call it from both `parseSms` and `parseSmsLoose` so strict and loose paths always agree.
2. **Dual-hash lookup during migration**: while scanning, filter out any SMS whose canonical hash OR legacy strict hash OR legacy loose hash is already in `sms_ingested`. This absorbs old rows without a DB migration.
3. **Backfill on scan**: whenever we skip an SMS because a legacy hash matched, upsert the new canonical hash into `sms_ingested` so subsequent scans are O(1).
4. **Guarantee ingestion on confirm/delete**: in `confirmPending`, `deletePending`, `deleteMany`, and `purgePending`, upsert the row's `sms_hash` into `sms_ingested` before/along with removing the pending row. This makes "already processed" truly permanent regardless of which path removed the row.
5. **Server-side check as a safety net**: before calling `aiExtractSms`, query `sms_ingested` for the batch's hashes and drop matches. Local `ingestedHashes` state can be stale right after a reload; the DB check closes that window.
6. **Small cleanup**: on load, also seed `sms_ingested` from any existing `sms_pending` rows the user still has, so pending rows survive a scan without being re-inserted.

## Technical notes

- Files touched: `src/lib/sms/parser.ts`, `src/hooks/useSmsImport.tsx`. No schema change, no new tables.
- Hash function stays `djb2` for stability; only the input is normalized (`sender.toUpperCase().trim() | floor(occurredAt/60000) | body.trim()`).
- The legacy-hash matcher runs only during the filter step — we don't rewrite history, we just teach the scanner to recognize old fingerprints and upgrade them.
- No UI changes; behavior change is invisible except that rescans stop resurrecting handled SMS.

## Out of scope

- Changing the "possible duplicate" rule against `transactions` (still same date + integer amount).
- Any change to the AI extraction prompt or credit-exclusion logic.
