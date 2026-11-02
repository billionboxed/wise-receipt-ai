import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";
import { findDuplicates } from "../memory";

export default defineTool({
  name: "add_expense",
  title: "Add expense",
  description: "Add an expense (or a credit/refund). Category and account are required. Refuses if the same date + whole amount already exists unless force is true.",
  inputSchema: {
    date: z.string().describe("YYYY-MM-DD"),
    description: z.string().min(1).max(200),
    amount: z.number().positive(),
    category_id: z.string().uuid(),
    account_id: z.string().uuid(),
    tag_ids: z.array(z.string().uuid()).optional(),
    type: z.enum(["debit", "credit"]).optional().describe("debit = expense (default), credit = refund"),
    force: z.boolean().optional().describe("Add even if a possible duplicate exists (only when the user confirms it's a different purchase)"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    if (!a.force) {
      const dups = await findDuplicates(sb, a.date, a.amount);
      if (dups.length) {
        return ok(`Not added: already recorded (${dups.map((d) => `${d.description} ₹${d.amount}`).join(", ")}). Pass force:true only if the user says it's a different purchase.`, { added: false, duplicate_of: dups });
      }
    }
    const { data, error } = await sb.from("transactions").insert({
      user_id: userId, date: a.date, description: a.description, amount: a.amount,
      category_id: a.category_id, account_id: a.account_id, tag_ids: a.tag_ids ?? [],
      type: a.type ?? "debit", status: "confirmed", source: "manual",
    }).select("id").single();
    if (error) fail(error.message);
    return ok(`Added expense ${data.id}`, { added: true, id: data.id });
  },
});
