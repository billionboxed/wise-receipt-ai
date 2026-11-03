# Fix recurring expenses (stopped adding after June 2026)

## What's wrong (checked)
- 5 active recurring expenses (Youtube Premium, Roti Maker, Car Wash, Maid, Netflix) were last added in June 2026. Nothing has been added for July to November.
- The daily scheduled job that adds them is gone. The scheduler has no jobs at all, probably lost when the backend moved.
- The job also only adds an expense if it runs on that exact day. Any missed day means that month gets skipped for good.

## Fix
1. **Restore the daily schedule.** Run the recurring job every day at 6 AM UTC again.
2. **Catch up on missed runs.** On each run, add every due date since the last one was added, up to today. Each entry gets its real due date, for example Netflix on 5 Jul, 5 Aug and so on.
3. **No double entries.** Skip a due date if that recurring expense already has a transaction on that date.
4. **Backfill now.** Run it once so July to November get filled in. That's about 4–5 months for each of the 5 active items. Akshat Shrivastava is paused, so it stays skipped.
5. **Backup trigger.** When the app opens, also run the catch-up for the signed-in user, so a missed schedule can't silently stop it again.

## Question for you
The backfill will add around 24 past transactions. If you'd rather not have the missed months filled in, say so and I'll only restart from today.

## Technical
- `process-recurring-expenses`: replace `shouldAddTransaction` with a loop over due dates from `last_added_date` (weekly/biweekly/monthly/quarterly, clamped to month end). Check for an existing `(recurring_expense_id, date)` before inserting. Set `last_added_date` to the last date inserted. Accept an optional user JWT so it can run for just that user.
- Add a pg_cron + pg_net schedule (`0 6 * * *`) through an insert, not a migration, because it contains the project URL/key.
- Call it once from the client after login (in `useRecurringExpenses`).
