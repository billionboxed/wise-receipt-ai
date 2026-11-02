import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "manage_preference",
  title: "Save or delete preference",
  description: "Save a standing instruction the user wants remembered across chats (e.g. 'Don't ask to confirm, just add'), or delete one by id.",
  inputSchema: {
    action: z.enum(["save", "delete"]),
    text: z.string().min(2).max(500).optional().describe("Required for save"),
    id: z.string().uuid().optional().describe("Required for delete"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    if (a.action === "delete") {
      if (!a.id) fail("id is required");
      const { error } = await sb.from("assistant_preferences").delete().eq("id", a.id);
      if (error) fail(error.message);
      return ok("Preference deleted", { id: a.id });
    }
    if (!a.text) fail("text is required");
    const { data, error } = await sb.from("assistant_preferences").insert({ user_id: userId, text: a.text.trim() }).select("id").single();
    if (error) fail(error.message);
    return ok(`Preference saved ${data.id}`, { id: data.id });
  },
});
