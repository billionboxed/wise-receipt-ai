import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, lookups, ok } from "../helpers";

export default defineTool({
  name: "list_sms_drafts",
  title: "List SMS drafts",
  description: "List SMS-detected expenses waiting in the SMS Inbox (pending) or in its Deleted section.",
  inputSchema: {
    status: z.enum(["pending", "deleted"]).optional().describe("Default pending"),
    account_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb } = db(ctx);
    let q = sb.from("sms_pending").select("id, parsed_date, parsed_amount, parsed_type, suggested_description, suggested_category_id, suggested_account_id, sms_sender, sms_raw").eq("status", a.status ?? "pending");
    if (a.account_id) q = q.eq("suggested_account_id", a.account_id);
    const { data, error } = await q.order("parsed_date", { ascending: false }).limit(a.limit ?? 100);
    if (error) fail(error.message);
    const L = await lookups(sb);
    const rows = (data ?? []).map((r) => ({
      id: r.id, date: r.parsed_date, amount: Number(r.parsed_amount), type: r.parsed_type, description: r.suggested_description,
      category: r.suggested_category_id ? L.cats.get(r.suggested_category_id) ?? null : null, category_id: r.suggested_category_id,
      account: r.suggested_account_id ? L.accs.get(r.suggested_account_id) ?? null : null, account_id: r.suggested_account_id,
      sender: r.sms_sender, sms: r.sms_raw,
    }));
    return ok(JSON.stringify(rows), { drafts: rows, count: rows.length });
  },
});
