import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "confirm_sms_draft",
  title: "Confirm SMS draft",
  description: "Turn a pending SMS draft into a real expense, optionally overriding its fields. Category and account must be set.",
  inputSchema: {
    id: z.string().uuid(),
    date: z.string().optional(),
    description: z.string().min(1).max(200).optional(),
    amount: z.number().positive().optional(),
    category_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    tag_ids: z.array(z.string().uuid()).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    const { data: r, error: e1 } = await sb.from("sms_pending").select("*").eq("id", a.id).eq("status", "pending").maybeSingle();
    if (e1) fail(e1.message);
    if (!r) fail("Pending SMS draft not found");
    const category_id = a.category_id ?? r.suggested_category_id;
    const account_id = a.account_id ?? r.suggested_account_id;
    if (!category_id || !account_id) fail("Category and account are required; pass category_id and account_id.");
    const { data: t, error } = await sb.from("transactions").insert({
      user_id: userId, date: a.date ?? r.parsed_date, description: (a.description ?? r.suggested_description ?? "SMS Transaction").slice(0, 200),
      amount: a.amount ?? r.parsed_amount, type: r.parsed_type, category_id, account_id, tag_ids: a.tag_ids ?? [],
      status: "confirmed", ai_suggested: true, source: "sms", sms_sender: r.sms_sender, sms_raw: r.sms_raw, sms_reviewed: true,
    }).select("id").single();
    if (error) fail(error.message);
    await sb.from("sms_pending").delete().eq("id", a.id);
    if (r.sms_hash) await sb.from("sms_ingested").upsert({ user_id: userId, sms_hash: r.sms_hash }, { onConflict: "user_id,sms_hash", ignoreDuplicates: true });
    return ok(`Confirmed as expense ${t.id}`, { transaction_id: t.id });
  },
});
