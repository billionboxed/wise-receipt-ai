import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, lookups, ok } from "../helpers";

export default defineTool({
  name: "spending_summary",
  title: "Spending summary",
  description: "Totals for a date range grouped by category, main category, account, tag, month or description (merchant). Credits/refunds are subtracted.",
  inputSchema: {
    from: z.string().describe("Start date YYYY-MM-DD"),
    to: z.string().describe("End date YYYY-MM-DD"),
    group_by: z.enum(["category", "main_category", "account", "tag", "month", "merchant"]),
    top: z.number().int().min(1).max(100).optional().describe("Return only top N groups"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb } = db(ctx);
    const { data, error } = await sb.from("transactions").select("date, description, amount, type, category_id, account_id, tag_ids").gte("date", a.from).lte("date", a.to).limit(20000);
    if (error) fail(error.message);
    const L = await lookups(sb);
    const g = new Map<string, { total: number; count: number }>();
    let total = 0;
    for (const t of data ?? []) {
      const amt = Number(t.amount) * (t.type === "credit" ? -1 : 1);
      total += amt;
      let keys: string[];
      const cat = t.category_id ? L.cats.get(t.category_id) ?? "Uncategorized" : "Uncategorized";
      switch (a.group_by) {
        case "category": keys = [cat]; break;
        case "main_category": keys = [cat.split(" > ")[0]]; break;
        case "account": keys = [t.account_id ? L.accs.get(t.account_id) ?? "Unknown" : "No account"]; break;
        case "tag": keys = (t.tag_ids ?? []).length ? (t.tag_ids as string[]).map((id) => L.tags.get(id) ?? id) : ["Untagged"]; break;
        case "month": keys = [String(t.date).slice(0, 7)]; break;
        default: keys = [String(t.description).trim().toLowerCase()];
      }
      for (const k of keys) {
        const e = g.get(k) ?? { total: 0, count: 0 };
        e.total += amt; e.count++; g.set(k, e);
      }
    }
    let groups = [...g.entries()].map(([name, v]) => ({ name, total: Math.round(v.total * 100) / 100, count: v.count }));
    groups.sort((x, y) => (a.group_by === "month" ? x.name.localeCompare(y.name) : y.total - x.total));
    if (a.top) groups = groups.slice(0, a.top);
    const out = { from: a.from, to: a.to, total: Math.round(total * 100) / 100, transactions: (data ?? []).length, groups };
    return ok(JSON.stringify(out), out);
  },
});
