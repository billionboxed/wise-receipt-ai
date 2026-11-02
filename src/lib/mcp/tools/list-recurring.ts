import { defineTool } from "@lovable.dev/mcp-js";
import { db, fail, lookups, ok } from "../helpers";

export default defineTool({
  name: "list_recurring",
  title: "List recurring expenses",
  description: "List the user's recurring expenses (subscriptions, rent, etc.).",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    const { sb } = db(ctx);
    const { data, error } = await sb.from("recurring_expenses").select("id, description, amount, frequency, day_of_month, is_active, last_added_date, category_id, account_id");
    if (error) fail(error.message);
    const L = await lookups(sb);
    const rows = (data ?? []).map((r) => ({
      ...r, amount: Number(r.amount),
      category: r.category_id ? L.cats.get(r.category_id) ?? null : null,
      account: r.account_id ? L.accs.get(r.account_id) ?? null : null,
    }));
    return ok(JSON.stringify(rows), { recurring: rows });
  },
});
