## Goal

Make "Scan" smarter so that after you add or change identifiers, a re-scan re-evaluates the entire SMS inbox with the current identifier list — without re-creating SMSes you've already confirmed, deleted, or that are still pending.

## How it works

### Two scan modes on the SMS Review page

1. **Scan new** (default tap on the Scan button)
   - Same as today: reads SMS since `lastScanAt`, applies current identifiers, ingests fresh ones.

2. **Full re-scan** (long-press the Scan button, or a "Re-scan all" item in a small menu next to Scan)
   - Reads the **entire** SMS inbox (no `sinceEpochMs`).
   - Applies the **current** identifier list as the filter.
   - For each candidate SMS, skip if its hash exists in `sms_ingested` (covers: already confirmed → transaction, already pending in inbox, already in deleted SMS box). This is the "already handled" guarantee.
   - Remaining = brand-new matches that previous scans missed because identifiers weren't configured yet. Run AI extraction + persist as pending, exactly like a normal scan.
   - Update `lastScanAt`.

### Cleanup of the noisy first scan

Separately (still needed, because the existing inbox already has unrelated messages):

- Add a **"Clean inbox with current identifiers"** action in the SMS Review header, shown only when identifiers exist AND pending rows exist.
- Partitions pending rows by whether `sender + body` contains any current identifier substring (lowercase match, same rule as scan).
- Non-matches → soft delete (move to Deleted SMS, recoverable).
- Matches with no `suggested_account_id` → auto-fill from the matched identifier.
- Confirmation dialog: "Move N message(s) without a matching identifier to Deleted SMS?"

### Inline hint

When pending rows exist but zero identifiers are configured, show a small banner linking to Settings → SMS: "Add identifiers to filter out unrelated messages."

## Files touched

- `src/hooks/useSmsImport.tsx`
  - `scanInbox(sinceEpochMs?)` already supports a full read when `sinceEpochMs` is omitted — wire a `fullRescan` boolean through so the UI can call it without passing `lastScanAt`.
  - New `reapplyIdentifiers()` for the cleanup action.
- `src/pages/SmsReview.tsx`
  - Scan button gains a small split/menu: "Scan new" / "Re-scan all SMS".
  - Header gets "Clean inbox" action + inline banner for the no-identifier case.

## Out of scope

- No re-running AI on rows already in the inbox.
- No DB schema changes — `sms_ingested` already provides the dedupe needed for full re-scans.
- Deleted SMS box behavior unchanged.
