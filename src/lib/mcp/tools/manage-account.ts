import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "manage_account",
  title: "Create or rename account",
  description: "Create a new account (bank, credit, cash, wallet) or rename/retype an existing one by passing its id.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Omit to create"),
    name: z.string().min(1).max(100),
    type: z.enum(["bank", "credit", "cash", "wallet"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    if (a.id) {
      const { error } = await sb.from("accounts").update({ name: a.name, ...(a.type ? { type: a.type } : {}) }).eq("id", a.id);
      if (error) fail(error.message);
      return ok("Account updated", { id: a.id });
    }
    const { data, error } = await sb.from("accounts").insert({ user_id: userId, name: a.name, type: a.type ?? "bank" }).select("id").single();
    if (error) fail(error.message);
    return ok(`Account created ${data.id}`, { id: data.id });
  },
});
