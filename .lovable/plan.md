
## Goal

Replace the current read-only AI chat with an **agentic assistant** that can execute the same actions the user has in the UI — expenses, categories, tags, accounts, SMS identifiers, SMS scanning, deleted-SMS management — through natural conversation. Single-item edits run immediately; bulk/destructive actions require inline approval; the last action performed by the AI is always reversible.

## Behavior

### Tools the agent gets
Grouped by domain. Each maps 1:1 to an existing app operation (no new business logic).

- **Transactions**: `list_transactions`, `add_expense`, `update_expense`, `delete_expense` (single), `delete_expenses_bulk` (needs approval)
- **Categories**: `list_categories`, `add_category`, `rename_category`, `delete_category` (needs approval — reassigns to Uncategorized)
- **Tags**: `list_tags`, `add_tag`, `rename_tag`, `archive_tag`, `delete_tag` (needs approval)
- **Accounts**: `list_accounts`, `add_account`, `rename_account`, `delete_account` (needs approval)
- **SMS identifiers**: `list_sms_identifiers`, `add_sms_identifier`, `remove_sms_identifier` (per account)
- **SMS scanning**: `scan_sms_new`, `scan_sms_all` (both auto-clean, both need approval — they may add/soft-delete many pending rows)
- **SMS pending**: `list_pending_sms`, `confirm_pending_sms` (single), `edit_pending_sms`, `skip_pending_sms`, `confirm_pending_sms_bulk` (needs approval)
- **Deleted SMS**: `list_deleted_sms`, `restore_deleted_sms`, `purge_deleted_sms` (needs approval — permanent)
- **Analytics reads** (no approval): `get_spending_summary`, `get_category_breakdown`, `search_transactions`

### Confirmation model — "confirm bulk only"
- Read-only tools run immediately.
- Single-item mutations run immediately (add one expense, add one identifier, rename one tag).
- Bulk/destructive tools (`*_bulk`, `delete_*`, `scan_sms_*`, `purge_deleted_sms`) render an **inline approval card** in the chat with the exact effect ("Will scan 412 SMS, add ~30 pending, soft-delete 8 non-matching") and Approve / Deny buttons. Nothing runs until Approve.

### Reversible last action
Every mutating tool call records a **reverse operation** into an in-memory `lastActionStack` (single entry — only the most recent AI action is undoable, as requested).

- After each mutation, chat shows a compact "Undo last action" affordance (also runnable via `/undo` or "undo that").
- Reverse ops per tool:
  - add_* → delete the created row
  - delete_* (single) → re-insert from captured snapshot
  - delete_*_bulk / scan_sms_* / auto-clean → re-insert all snapshotted rows / restore soft-deleted pending rows
  - update_* / rename_* / archive_* → restore prior field values from snapshot
  - confirm_pending_sms → move transaction back to pending
  - restore_deleted_sms → soft-delete it again
  - purge_deleted_sms → not reversible; the approval card says so explicitly
- Undo itself is not re-undoable; performing a new action replaces the undo entry.

### Example flow (user's scenario)
1. User: "remove all the SMS history, then I want to add accounts and identifiers."
2. AI proposes `purge_deleted_sms` + a plan; approval card shows "Permanently delete 87 SMS. Not reversible." User approves.
3. AI asks for account names; user provides. AI calls `add_account` per item (single-item, no approval, each undoable one at a time — last one wins in the undo slot).
4. AI asks for identifiers per account, calls `add_sms_identifier`.
5. User: "rescan all SMS with these." AI proposes `scan_sms_all`, approval card shows the projected effect. Approve → runs, results appear in SMS Review AND inline in chat.
6. Chat lists new pending SMS with per-row "Confirm" / "Skip" / "Edit" — each maps to the corresponding pending-SMS tool. Confirming from chat updates the SMS Review page in real time (shared `useExpenseData` / `useSmsImport` state).

### Chat surface
- Replace the current `/ai-chat` (`src/pages/AIChat.tsx`) with the new agent. Same route, same entry point, no second chat page.
- The floating chat button (`AIFloatingButton` → `ExpenseAIChat`) also points at the same agent so it works from any page.
- Built with AI Elements primitives (Conversation, Message, Tool, PromptInput, Shimmer). Tool calls render as collapsed accordions with a domain-specific icon; approval cards render as a custom tool output component.

## Technical details

- **Model & runtime**: AI SDK `streamText` on a new Supabase Edge Function `agent-chat` (Lovable AI Gateway, model `google/gemini-3-flash-preview`). Replaces the streaming call in `expense-ai-chat`. `stopWhen: stepCountIs(50)`.
- **Tools live in the edge function**: each tool has a Zod `inputSchema`, an `execute` that calls Supabase with the caller's JWT (RLS enforces per-user scope), and `needsApproval` set for the bulk/destructive ones. The client renders `type: 'tool-*'` message parts; approval is sent back via `addToolResult`/`sendMessage` per AI SDK tool-usage docs.
- **Shared logic reuse**: SMS scanning and auto-clean logic currently lives in the `useSmsImport` hook (client-side, uses native SMS plugin). For scans initiated by the agent, the tool calls the same client-side path via a thin dispatcher: the edge-function tool returns a `client_action` payload, and the chat UI executes `scanInbox({ fullRescan })` from `useSmsImport`, then reports the result back to the model (standard AI SDK client-tool pattern). All non-SMS-native tools run server-side directly against Supabase.
- **Undo stack**: kept in a new `useAgentUndo` React context (memory-only, cleared on reload). Each tool `execute` returns `{ result, reverse: { tool, input } }`; the UI stores only the latest and renders the Undo button. Undo dispatches the stored reverse tool call through the same tool pipeline.
- **Files touched**:
  - New: `supabase/functions/agent-chat/index.ts`, `supabase/functions/agent-chat/tools.ts`, `src/hooks/useAgentUndo.tsx`, `src/components/chat/ApprovalCard.tsx`, `src/components/chat/ToolResultRenderer.tsx`, `src/components/chat/PendingSmsInline.tsx`
  - Rewrite: `src/pages/AIChat.tsx` (AI Elements composition, tool rendering, approval flow, undo), `src/components/chat/ExpenseAIChat.tsx` (floating variant → same transport)
  - Extend: `src/hooks/useSmsImport.tsx` (expose scan + auto-clean as a callable the agent bridge can invoke; no behavior change for existing SMS Review page)
  - Deprecate: `supabase/functions/expense-ai-chat/index.ts` (kept until new function is verified, then removed)
- **AI Elements install**: `bunx ai-elements@latest add conversation message prompt-input shimmer tool`.
- **Out of scope**: no schema changes, no changes to SMS Review page behavior, no changes to onboarding/tour, no multi-step undo history, no changes to non-agent parts of the app.

