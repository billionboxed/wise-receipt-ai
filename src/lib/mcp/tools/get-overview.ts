import { defineTool } from "@lovable.dev/mcp-js";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "get_overview",
  title: "Get account overview",
  description: "List the signed-in user's accounts, categories (Main > Sub), tags, SMS identifiers and SMS settings, with IDs to use in other tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { sb } = db(ctx);
    const [a, c, t, i, p, n] = await Promise.all([
      sb.from("accounts").select("id, name, type").order("name"),
      sb.from("categories").select("id, main, sub").order("main").order("sub"),
      sb.from("tags").select("id, name, color, is_archived").order("name"),
      sb.from("account_sms_identifiers").select("id, account_id, identifier"),
      sb.from("sms_preferences").select("*").maybeSingle(),
      sb.from("transactions").select("id", { count: "exact", head: true }),
    ]);
    const err = a.error || c.error || t.error;
    if (err) fail(err.message);
    const data = {
      accounts: (a.data ?? []).map((x) => ({ ...x, sms_identifiers: (i.data ?? []).filter((y) => y.account_id === x.id).map((y) => ({ id: y.id, identifier: y.identifier })) })),
      categories: (c.data ?? []).map((x) => ({ id: x.id, name: `${x.main} > ${x.sub}` })),
      tags: t.data ?? [],
      sms_preferences: p.data ?? null,
      total_expenses: n.count ?? 0,
    };
    return ok(JSON.stringify(data), data);
  },
});
