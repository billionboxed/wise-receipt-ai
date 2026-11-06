# Tap-to-drill-down everywhere on the Home page

## Goal
Every number or item on the Home page can be tapped to see the transactions behind it, and going back (swipe or back button) always returns you to exactly where you were on Home.

## What you will experience
- **Stat cards** (Total Expenses, This Month, Last Month, Avg. Transaction): tap opens a slide-in panel with those transactions. "This Month" shows this month's expenses, "Last Month" last month's, "Total" the current date filter.
- **Categories**: tap a category, the panel shows its transactions grouped by sub-category, with small chips to narrow to one sub-category.
- **Accounts**: tap an account, the panel shows spending from that account.
- **Tags**: tap a tag, the panel shows transactions with that tag.
- **Inside the panel**: total + count at the top, newest first, tap a transaction to edit it, swipe to edit/delete with the same 5-second undo as elsewhere.
- **Back behaves naturally**: Android back gesture / browser back closes the panel and leaves you on Home at the same scroll position. It no longer jumps to the Transactions tab.
- **"See all in Transactions"** button at the bottom opens the full list pre-filtered (category, account, tag or month). Going back from there returns to Home with the panel reopened.
- Feels instant: opens from data already loaded, no waiting; long lists load more as you scroll instead of cutting off at 50.

## Technical details
- Replace `TransactionPreviewDrawer` with one shared `DrillDownSheet` driven by a URL query param (`?drill=category:Food`, `account:<id>`, `tag:<id>`, `period:this-month|last-month|all`). Opening pushes a history entry; closing calls `navigate(-1)`, so the hardware/gesture back simply closes the sheet. Mounted once in `Dashboard.tsx`.
- Filter by IDs (not names) for accounts/tags; categories by main name with optional sub filter.
- Wire `StatCard` (add `onClick` + pressable styling), `CategoryChart`, `AccountSummary`, `TagsSpending`, `RecentTransactions` category chips to open the sheet.
- Reuse existing transaction row, edit dialog, swipe + undo logic inside the sheet; incremental rendering (render 30, extend on scroll).
- `Transactions.tsx`: read `account`, `tag`, `period` query params in addition to `category`, so "See all" lands pre-filtered.
- Preserve Home scroll position on return.
