# ClearSpends connector for ChatGPT (and Claude)

## What you get
A secure connector URL you paste into ChatGPT (Settings → Connectors → Add). The first time, ChatGPT opens a ClearSpends page: you sign in with Google and press **Allow**. After that ChatGPT can read and change only **your** data — never anyone else's. You can revoke it any time.

## Tools ChatGPT will have

**Read / analysis**
- Overview: accounts, categories (Main > Sub), tags, currency, SMS settings
- List expenses with filters (date range, account, category, tag, amount, text search)
- Spending summary: totals by category, account, tag, month; compare two periods
- Top merchants / largest expenses
- Recurring expenses list
- SMS inbox: pending and deleted SMS drafts

**Change expenses**
- Add expense (category and account required, same as the app)
- Edit expense (amount, date, description, category, account, tags)
- Delete expense(s) — marked as destructive so ChatGPT asks you first
- Duplicate an expense

**Setup items**
- Add / rename accounts, categories, tags; archive tags
- Add / remove SMS identifiers on an account
- Confirm, edit or delete pending SMS drafts

Not possible from ChatGPT: actually scanning your phone's SMS (that only happens inside the Android app).

## Ideas to expand later
- Budgets per category with "how am I doing this month" checks
- Monthly report tool (ChatGPT writes a spending review)
- Bulk recategorize ("move all Swiggy to Food > Delivery")
- Recurring expense create/edit
- Export to CSV via chat
- Same tools in the in-app browser for AI agents (WebMCP)

## Technical details
- Enable managed OAuth server (`supabase--configure_oauth_server`); consent page at `/.lovable/oauth/consent`; Auth page preserves `next` through Google sign-in redirect.
- `@lovable.dev/mcp-js` + `mcpPlugin()` in vite config; tools in `src/lib/mcp/tools/*`, server title "Transferred Smart Expense Manager" (slug name), OAuth issuer verification with client-claim check.
- All DB access via caller-scoped client (`supabaseForUser`), existing RLS unchanged; no service-role key.
- Extract manifest, then you republish; connector URL = backend `/functions/v1/mcp`.
