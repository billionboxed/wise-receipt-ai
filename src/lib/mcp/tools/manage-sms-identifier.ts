import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "manage_sms_identifier",
  title: "Add or remove SMS identifier",
  description: "Add an SMS identifier (e.g. card last-4 or bank name) to an account, or remove one by id. Takes effect on the next scan in the Android app.",
  inputSchema: {
    action: z.enum(["add", "remove"]),
    account_id: z.string().uuid().optional().describe("Required for add"),
    identifier: z.string().min(2).max(40).optional().describe("Required for add"),
    id: z.string().uuid().optional().describe("Identifier id, required for remove"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    if (a.action === "remove") {
      if (!a.id) fail("id is required");
      const { error } = await sb.from("account_sms_identifiers").delete().eq("id", a.id);
      if (error) fail(error.message);
      return ok("Identifier removed", { id: a.id });
    }
    if (!a.account_id || !a.identifier) fail("account_id and identifier are required");
    const { data, error } = await sb.from("account_sms_identifiers").insert({ user_id: userId, account_id: a.account_id, identifier: a.identifier.trim() }).select("id").single();
    if (error) fail(error.message);
    return ok(`Identifier added ${data.id}`, { id: data.id });
  },
});
