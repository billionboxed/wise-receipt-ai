import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "update_expense",
  title: "Update expenses",
  description: "Edit one or more expenses. Only the fields you pass are changed (e.g. bulk recategorize by passing several IDs and a category_id).",
  inputSchema: {
    ids: z.array(z.string().uuid()).min(1).max(500),
    date: z.string().optional(),
    description: z.string().min(1).max(200).optional(),
    amount: z.number().positive().optional(),
    category_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    tag_ids: z.array(z.string().uuid()).optional().describe("Replaces all tags"),
    type: z.enum(["debit", "credit"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ ids, ...fields }, ctx) => {
    const { sb } = db(ctx);
    const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    if (!Object.keys(patch).length) fail("Nothing to update");
    const { data, error } = await sb.from("transactions").update(patch).in("id", ids).select("id");
    if (error) fail(error.message);
    return ok(`Updated ${data.length} expense(s)`, { updated: data.length });
  },
});
