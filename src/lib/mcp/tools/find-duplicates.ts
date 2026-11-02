import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { db, ok } from "../helpers";
import { findDuplicates } from "../memory";

export default defineTool({
  name: "find_duplicates",
  title: "Check if already recorded",
  description: "Check whether an expense with the same date and same whole-number amount already exists (e.g. a re-shared receipt).",
  inputSchema: { date: z.string().describe("YYYY-MM-DD"), amount: z.number().positive() },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    const { sb } = db(ctx);
    const matches = await findDuplicates(sb, a.date, a.amount);
    return ok(matches.length ? `Already recorded: ${JSON.stringify(matches)}` : "No existing match", { matches });
  },
});
