import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, fail, ok } from "../helpers";

export default defineTool({
  name: "delete_expenses",
  title: "Delete expenses",
  description: "Permanently delete expenses by ID. Confirm with the user before calling.",
  inputSchema: { ids: z.array(z.string().uuid()).min(1).max(500) },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ ids }, ctx) => {
    const { sb } = db(ctx);
    const { data, error } = await sb.from("transactions").delete().in("id", ids).select("id");
    if (error) fail(error.message);
    return ok(`Deleted ${data.length} expense(s)`, { deleted: data.length });
  },
});
