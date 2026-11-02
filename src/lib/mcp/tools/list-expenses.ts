import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, lookups, ok } from "../helpers";

export default defineTool({
  name: "list_expenses",
  title: "List expenses",
  description: "List expenses with optional filters (date range, account, category, tag, amount, text). Returns resolved names.",
  inputSchema: {
    from: z.string().optional().describe("Start date YYYY-MM-DD (inclusive)"),
    to: z.string().optional().describe("End date YYYY-MM-DD (inclusive)"),
    account_id: z.string().uuid().optional(),
    category_id: z.string().uuid().optional(),
    tag_id: z.string().uuid().optional(),
    min_amount: z.number().optional(),
    max_amount: z.number().optional(),
    search: z.string().optional().describe("Text to find in description"),
    sort: z.enum(["date_desc", "date_asc", "amount_desc", "recent_added"]).optional(),
    limit: z.number().int().min(1).max(500).optional().describe("Default 100"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb } = db(ctx);
    let q = sb.from("transactions").select("id, date, description, amount, type, category_id, account_id, tag_ids, source, created_at");
    if (a.from) q = q.gte("date", a.from);
    if (a.to) q = q.lte("date", a.to);
    if (a.account_id) q = q.eq("account_id", a.account_id);
    if (a.category_id) q = q.eq("category_id", a.category_id);
    if (a.tag_id) q = q.contains("tag_ids", [a.tag_id]);
    if (a.min_amount != null) q = q.gte("amount", a.min_amount);
    if (a.max_amount != null) q = q.lte("amount", a.max_amount);
    if (a.search) q = q.ilike("description", `%${a.search.replace(/[%_]/g, "")}%`);
    const s = a.sort ?? "date_desc";
    q = s === "amount_desc" ? q.order("amount", { ascending: false }) : s === "recent_added" ? q.order("created_at", { ascending: false }) : q.order("date", { ascending: s === "date_asc" });
    const { data, error } = await q.limit(a.limit ?? 100);
    if (error) fail(error.message);
    const L = await lookups(sb);
    const rows = (data ?? []).map((t) => ({
      id: t.id, date: t.date, description: t.description, amount: Number(t.amount), type: t.type,
      category: t.category_id ? L.cats.get(t.category_id) ?? null : null, category_id: t.category_id,
      account: t.account_id ? L.accs.get(t.account_id) ?? null : null, account_id: t.account_id,
      tags: (t.tag_ids ?? []).map((id: string) => L.tags.get(id) ?? id), source: t.source,
    }));
    return ok(JSON.stringify(rows), { expenses: rows, count: rows.length });
  },
});
