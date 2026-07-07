// Tool schemas shared between the client executor and the edge function.
// Each tool is an OpenAI-compatible function definition. `needsApproval`
// makes the UI show an Approve/Deny card before executing.

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  needsApproval?: boolean;
  // Human-friendly one-liner used in the approval card. If omitted, we
  // fall back to the description + JSON args.
  summary?: (args: any) => string;
}

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const bool = { type: "boolean" } as const;

export const TOOLS: ToolDef[] = [
  // ---------- Reads ----------
  {
    name: "list_accounts",
    description: "List all of the user's accounts.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_categories",
    description: "List all of the user's expense categories.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_tags",
    description: "List all of the user's tags.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_transactions",
    description:
      "List recent confirmed transactions. Optional filters. Returns at most 50 rows.",
    parameters: {
      type: "object",
      properties: {
        since: { ...str, description: "ISO date lower bound (inclusive)" },
        until: { ...str, description: "ISO date upper bound (inclusive)" },
        categoryName: str,
        accountName: str,
        limit: { ...num, description: "Max rows, default 20" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_spending_summary",
    description:
      "Return totals for a period. period ∈ 'this_month'|'last_month'|'this_year'|'all_time'.",
    parameters: {
      type: "object",
      properties: { period: str },
      required: ["period"],
      additionalProperties: false,
    },
  },
  {
    name: "list_sms_identifiers",
    description: "List SMS identifiers configured per account.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_pending_sms",
    description: "List pending (parsed but unconfirmed) SMS transactions.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_deleted_sms",
    description: "List soft-deleted SMS in the Deleted SMS bin.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },

  // ---------- Single-item mutations (no approval) ----------
  {
    name: "add_expense",
    description:
      "Add a single confirmed expense. Amount must be positive. Use list_categories/list_accounts first to get IDs; if the user provides names, resolve them.",
    parameters: {
      type: "object",
      properties: {
        date: { ...str, description: "yyyy-mm-dd" },
        description: str,
        amount: num,
        categoryId: str,
        accountId: str,
      },
      required: ["date", "description", "amount", "categoryId", "accountId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_expense",
    description: "Delete a single transaction by id.",
    parameters: {
      type: "object",
      properties: { id: str },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "add_category",
    description: "Create a new category. `combined` is auto-formed as 'main > sub'.",
    parameters: {
      type: "object",
      properties: { main: str, sub: str },
      required: ["main", "sub"],
      additionalProperties: false,
    },
  },
  {
    name: "add_tag",
    description: "Create a new tag.",
    parameters: {
      type: "object",
      properties: { name: str, color: { ...str, description: "hex, e.g. #6366f1" } },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "add_account",
    description: "Create a new account.",
    parameters: {
      type: "object",
      properties: {
        name: str,
        type: { ...str, description: "bank | credit | cash | wallet" },
      },
      required: ["name", "type"],
      additionalProperties: false,
    },
  },
  {
    name: "add_sms_identifier",
    description:
      "Attach an SMS identifier (bank name, card last-4, sender code) to an account so scans can match.",
    parameters: {
      type: "object",
      properties: { accountId: str, identifier: str },
      required: ["accountId", "identifier"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_sms_identifier",
    description: "Remove an SMS identifier by its id.",
    parameters: {
      type: "object",
      properties: { id: str },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "confirm_pending_sms",
    description: "Turn one pending SMS into a confirmed transaction.",
    parameters: {
      type: "object",
      properties: { id: str },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_pending_sms",
    description: "Soft-delete one pending SMS (moves to Deleted SMS).",
    parameters: {
      type: "object",
      properties: { id: str },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "restore_deleted_sms",
    description: "Restore one deleted SMS back to pending.",
    parameters: {
      type: "object",
      properties: { id: str },
      required: ["id"],
      additionalProperties: false,
    },
  },

  // ---------- Bulk / destructive (needsApproval) ----------
  {
    name: "delete_account",
    description: "Delete an account. Transactions on this account will lose their account link.",
    parameters: {
      type: "object",
      properties: { id: str },
      required: ["id"],
      additionalProperties: false,
    },
    needsApproval: true,
    summary: (a) => `Delete account ${a.id}`,
  },
  {
    name: "scan_sms",
    description:
      "Trigger an SMS inbox scan. fullRescan=true reads the entire inbox; false reads only since the last scan. Uses current identifiers.",
    parameters: {
      type: "object",
      properties: { fullRescan: bool },
      required: ["fullRescan"],
      additionalProperties: false,
    },
    needsApproval: true,
    summary: (a) => (a.fullRescan ? "Scan the entire SMS inbox" : "Scan new SMS since last scan"),
  },
  {
    name: "confirm_pending_sms_bulk",
    description: "Confirm many pending SMS at once.",
    parameters: {
      type: "object",
      properties: { ids: { type: "array", items: str } },
      required: ["ids"],
      additionalProperties: false,
    },
    needsApproval: true,
    summary: (a) => `Confirm ${a.ids?.length ?? 0} pending SMS as transactions`,
  },
  {
    name: "delete_pending_sms_bulk",
    description: "Soft-delete many pending SMS (moves them to Deleted SMS).",
    parameters: {
      type: "object",
      properties: { ids: { type: "array", items: str } },
      required: ["ids"],
      additionalProperties: false,
    },
    needsApproval: true,
    summary: (a) => `Delete ${a.ids?.length ?? 0} pending SMS`,
  },
  {
    name: "purge_deleted_sms_all",
    description: "Permanently empty the Deleted SMS bin. Not reversible.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    needsApproval: true,
    summary: () => "Permanently empty the Deleted SMS bin (not reversible)",
  },
];

export const TOOL_MAP: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t]),
);

export function isDestructive(name: string): boolean {
  return !!TOOL_MAP[name]?.needsApproval;
}