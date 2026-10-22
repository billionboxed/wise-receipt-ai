## Goal

Let the user pick a "Track SMS from" date so scans ignore older SMS.

## What the user sees

- **Settings > SMS Auto-Import** gets a new card, **Track SMS from**:
  - A date picker showing the current start date, or "All time" if none is set.
  - A **Start fresh from today** button that sets the date to today.
  - A **Clear** link that goes back to "All time".
- Scans only bring in SMS on or after this date. This applies to the Scan button, live capture of new SMS, and scans started from the AI chat.
- SMS already waiting in the inbox from before the date are hidden on the next scan. They are not deleted, so if the user moves the date earlier they come back.
- The AI assistant can set or clear the date, for example "only track SMS from October".

## Technical details

- Migration: add a nullable `track_from date` column to `sms_preferences`, then regenerate the types.
- `useSmsImport`:
  - Add `trackFrom` to prefs, plus load and save it.
  - In `scanInbox`, the earliest SMS to read becomes the later of the track-from date and the normal scan start (all time on a full rescan).
  - The live SMS listener drops SMS older than `trackFrom`.
- Inbox list (`SmsReview`): filter out pending rows whose date is before `trackFrom`, and keep them stored.
- Agent: add a `set_sms_track_from` tool (date or null) to `tools.ts` / `useAgentTools.tsx`, and mention it in the agent-chat prompt.
- Save a memory note about the SMS start-date rule.

## Out of scope

- Changes to the duplicate rules or the AI extraction.
