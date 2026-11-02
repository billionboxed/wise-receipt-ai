import { defineTool } from "@lovable.dev/mcp-js";
import { db, lookups, ok } from "../helpers";
import { loadMemory } from "../memory";

export default defineTool({
  name: "get_memory",
  title: "Get assistant memory",
  description: "Read the user's saved assistant preferences and merchant rules. Follow them in every chat.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    const { sb } = db(ctx);
    const m = await loadMemory(sb);
    const L = await lookups(sb);
    const data = {
      preferences: m.preferences,
      merchant_rules: m.merchant_rules.map((r) => ({
        ...r,
        category: r.category_id ? L.cats.get(r.category_id) ?? null : null,
        account: r.account_id ? L.accs.get(r.account_id) ?? null : null,
        tags: (r.tag_ids ?? []).map((id: string) => L.tags.get(id) ?? id),
      })),
    };
    return ok(JSON.stringify(data), data);
  },
});
