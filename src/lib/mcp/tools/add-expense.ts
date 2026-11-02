import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "add_expense",
  title: "Add expense",
  description: "Add an expense (or a credit/refund). Category and account are required; get IDs from get_overview.",
  inputSchema: {
    date: z.string().describe("YYYY-MM-DD"),
    description: z.string().min(1).max(200),
    amount: z.number().positive(),
    category_id: z.string().uuid(),
    account_id: z.string().uuid(),
    tag_ids: z.array(z.string().uuid()).optional(),
    type: z.enum(["debit", "credit"]).optional().describe("debit = expense (default), credit = refund"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    const { data, error } = await sb.from("transactions").insert({
      user_id: userId, date: a.date, description: a.description, amount: a.amount,
      category_id: a.category_id, account_id: a.account_id, tag_ids: a.tag_ids ?? [],
      type: a.type ?? "debit", status: "confirmed", source: "manual",
    }).select("id").single();
    if (error) fail(error.message);
    return ok(`Added expense ${data.id}`, { id: data.id });
  },
});
