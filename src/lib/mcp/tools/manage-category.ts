import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "manage_category",
  title: "Create or rename category",
  description: "Create a Main > Sub category, or rename an existing one by passing its id.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Omit to create"),
    main: z.string().min(1).max(60),
    sub: z.string().min(1).max(60),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb, userId } = db(ctx);
    const row = { main: a.main, sub: a.sub, combined: `${a.main} > ${a.sub}` };
    if (a.id) {
      const { error } = await sb.from("categories").update(row).eq("id", a.id);
      if (error) fail(error.message);
      return ok("Category updated", { id: a.id });
    }
    const { data, error } = await sb.from("categories").insert({ ...row, user_id: userId }).select("id").single();
    if (error) fail(error.message);
    return ok(`Category created ${data.id}`, { id: data.id });
  },
});
