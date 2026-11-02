# Make ChatGPT remember your choices across chats

ChatGPT forgets between chats, so the memory has to live in ClearSpends. Every new chat begins by reading it from your account.

## What gets stored in ClearSpends

1. **Assistant preferences.** These are general instructions for ChatGPT, for example:
   - "Don't ask me to confirm, just add expenses from screenshots"
   - "Default account: HDFC Card"
   - "Always tag food purchases with Personal"
2. **Merchant rules.** A merchant maps to a category, an account and optional tags, for example McDonald's → Food > Dining Out · HDFC Card. Once a rule exists, ChatGPT applies it without asking.
3. **Duplicate protection.** Before adding an expense, ClearSpends checks for an existing one with the same date and the same whole-number amount (the rule the app already uses). If you share the same screenshot again, ChatGPT is told "already recorded" and doesn't add it twice.

## How it works in chat

- In any new chat, ChatGPT loads your preferences and merchant rules first.
- After you answer a question like "Yes, HDFC Card", ChatGPT offers to remember it, or saves it right away if you say "remember this".
- You can say "forget the McDonald's rule" or "stop auto-adding" at any time.

## In the app

There will be a small **Assistant memory** page under Settings, where you can view, edit and delete preferences and merchant rules. The in-app AI chat uses the same memory.

## Technical details

- New tables `assistant_preferences` (user_id, text, created_at) and `merchant_rules` (user_id, merchant_pattern, category_id, account_id, tag_ids), with RLS limited to the owner and grants.
- New MCP tools: `get_memory`, `save_preference`, `delete_preference`, `save_merchant_rule`, `delete_merchant_rule`, and `find_duplicates` (date plus integer amount).
- `get_overview` includes the memory. `add_expense` checks for duplicates by default and returns `duplicate_of` unless `force: true` is passed. The server instructions tell the assistant to call `get_overview` first, apply the rules, skip confirmation when a preference says so, and offer to save new choices.
- Matching merchant rules are also applied to the in-app agent-chat prompt context.
- Re-extract the manifest after the changes, then republish.
