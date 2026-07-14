## Simplify SMS Inbox controls

### Scan button
- Replace the Scan dropdown (Scan new / Scan all) in `src/pages/SmsReview.tsx` with a single **Scan** button.
- Under the hood always call `scanInbox({ fullRescan: true })` so every scan walks the entire inbox using the latest account identifiers. Already-processed SMS are skipped via the existing `sms_ingested` hash table, and deleted SMS stay hidden because their hashes are also recorded — so nothing the user already handled reappears.
- Keep the toast summary (added / cleaned / auto-assigned).
- Remove the now-unused `History` import and `mode` argument from `onScan`.

### Deleted SMS on the same page
- Add a collapsible **Deleted** section at the bottom of `/sms-review` showing the same trash list currently rendered in Settings:
  - Row: description · date · sender · amount
  - Actions: Restore (`restorePending`) and Delete permanently (`purgePending`)
  - Header action: **Empty** (`emptyTrash`) when non-empty
- Section is collapsed by default with a count badge (e.g. "Deleted (3)") so it doesn't clutter the inbox.
- Data already comes from `useSmsImport().pending.filter(p => p.status === 'deleted')` — no hook changes needed.

### Settings cleanup
- In `src/pages/settings/SmsSettings.tsx`:
  - Remove the "Deleted SMS" card (now lives on `/sms-review`).
  - Replace the two scan buttons ("Scan new" / "Scan all SMS") with a single **Scan** button that also runs full rescan.
  - Keep the toggle, default-account picker, identifier hint, last-scanned timestamp, and "Open SMS inbox →" link.

### Notes
- No schema, hook, or edge-function changes. `scanInbox` already supports `fullRescan: true` and dedupes via `sms_ingested`.
- No changes to the agent tools — the `scan_sms` tool continues to work; if desired later we can drop its `fullRescan` param, but leaving it is harmless.
