import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "manage_merchant_rule",
  title: "Save or delete merchant rule",
  description: "Remember which category/account/tags to use for a merchant (e.g. McDonald's → Food > Dining Out, HDFC Card). Saving the same merchant again updates it. Delete by id.",
  inputSchema: {
    action: z.enum(["save", "delete"]),
    merchant: z.string().min(2).max(80).optional().describe("Merchant name as it appears on receipts; required for save"),
    category_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    tag_ids: z.array(z.string().uuid()).optional(),
    id: z.string().uuid().optional().describe("Required for delete"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    if (a.action === "delete") {
      if (!a.id) fail("id is required");
      const { error } = await sb.from("merchant_rules").delete().eq("id", a.id);
      if (error) fail(error.message);
      return ok("Rule deleted", { id: a.id });
    }
    if (!a.merchant) fail("merchant is required");
    if (!a.category_id && !a.account_id) fail("Pass at least a category_id or account_id");
    const { data, error } = await sb.from("merchant_rules").upsert({
      user_id: userId, merchant_pattern: a.merchant.trim().toLowerCase(),
      category_id: a.category_id ?? null, account_id: a.account_id ?? null, tag_ids: a.tag_ids ?? [],
    }, { onConflict: "user_id,merchant_pattern" }).select("id").single();
    if (error) fail(error.message);
    return ok(`Rule saved ${data.id}`, { id: data.id });
  },
});
