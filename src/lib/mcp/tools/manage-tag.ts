import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "manage_tag",
  title: "Create, rename or archive tag",
  description: "Create a tag, or update an existing tag's name, color or archived state by passing its id.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Omit to create"),
    name: z.string().min(1).max(60).optional(),
    color: z.string().optional().describe("Hex like #6b7280"),
    is_archived: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    if (a.id) {
      const patch = Object.fromEntries(Object.entries({ name: a.name, color: a.color, is_archived: a.is_archived }).filter(([, v]) => v !== undefined));
      const { error } = await sb.from("tags").update(patch).eq("id", a.id);
      if (error) fail(error.message);
      return ok("Tag updated", { id: a.id });
    }
    if (!a.name) fail("name is required to create a tag");
    const { data, error } = await sb.from("tags").insert({ user_id: userId, name: a.name, color: a.color ?? "#6b7280" }).select("id").single();
    if (error) fail(error.message);
    return ok(`Tag created ${data.id}`, { id: data.id });
  },
});
