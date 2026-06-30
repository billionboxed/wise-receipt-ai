## Goal

Simplify the SMS inbox to just two actions — **Scan new** and **Scan all** — and fold the "Clean inbox" cleanup into every scan automatically. Deleted SMS box stays as-is (recoverable trash).

## Behavior

### Scan new (default tap)
- Reads SMS since `lastScanAt`.
- Applies current identifiers as the filter (sender+body substring, lowercase).
- Skips any SMS whose hash is already in `sms_ingested` (covers confirmed, pending, deleted).
- Runs AI extraction on the rest, saves as pending.
- Updates `lastScanAt`.
- **Then auto-cleans existing pending rows** (see below).

### Scan all
- Same as Scan new, but reads the **entire** SMS inbox (no `sinceEpochMs`).
- Same identifier filter, same dedupe via `sms_ingested` (so confirmed + pending + deleted are all skipped — previously deleted SMS never reappear).
- Same AI extraction + persist + auto-clean.

### Auto-clean (runs after every scan)
For each existing pending row (status `pending`):
- If `sender + body` matches no current identifier → soft-delete (moves to Deleted SMS).
- If it matches but has no `suggested_account_id` → auto-fill from that identifier's account.

If zero identifiers are configured, auto-clean is skipped (otherwise it would wipe the inbox).

### Toast summary after a scan
"Added N · cleaned M · assigned K accounts" (parts hidden when zero).

## UI changes on `src/pages/SmsReview.tsx`

- Replace the current dropdown + separate "Clean inbox" button with a single split control:
  - Primary button: **Scan new**
  - Dropdown item: **Scan all SMS**
- Remove the standalone "Clean inbox" action and its confirm dialog.
- Keep the no-identifier inline banner ("Add identifiers in Settings → SMS…").
- Keep the Deleted SMS view (no changes).

## Code changes

- `src/hooks/useSmsImport.tsx`
  - `scanInbox({ fullRescan }: { fullRescan?: boolean })` — controls whether `sinceEpochMs` is passed.
  - At the end of `scanInbox`, call `reapplyIdentifiers()` automatically when identifiers exist; return `{ added, removed, autoAssigned }` for the toast.
  - `reapplyIdentifiers` stays as-is internally but is no longer exposed as a user action.
- `src/pages/SmsReview.tsx`
  - Simplified Scan control, removed Clean inbox button, updated toast.

## Out of scope

- No DB changes.
- No changes to Deleted SMS box, swipe-edit/swipe-delete on pending rows, or the edit dialog.
- No re-running AI on rows already in the inbox.
