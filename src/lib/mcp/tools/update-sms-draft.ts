import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "update_sms_draft",
  title: "Edit, delete or restore SMS draft",
  description: "Edit a pending SMS draft's suggested fields, move drafts to Deleted, or restore deleted drafts. Does not create expenses.",
  inputSchema: {
    action: z.enum(["edit", "delete", "restore"]),
    ids: z.array(z.string().uuid()).min(1).max(500),
    date: z.string().optional(),
    description: z.string().min(1).max(200).optional(),
    amount: z.number().positive().optional(),
    category_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb } = db(ctx);
    let patch: Record<string, unknown>;
    if (a.action === "delete") patch = { status: "deleted" };
    else if (a.action === "restore") patch = { status: "pending" };
    else {
      patch = Object.fromEntries(Object.entries({
        parsed_date: a.date, suggested_description: a.description, parsed_amount: a.amount,
        suggested_category_id: a.category_id, suggested_account_id: a.account_id,
      }).filter(([, v]) => v !== undefined));
      if (!Object.keys(patch).length) fail("Nothing to edit");
    }
    const { data, error } = await sb.from("sms_pending").update(patch).in("id", a.ids).select("id");
    if (error) fail(error.message);
    return ok(`${a.action}: ${data.length} draft(s)`, { affected: data.length });
  },
});
