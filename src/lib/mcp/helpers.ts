import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export function db(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
  const userId = ctx.getUserId();
  if (!userId) throw new ToolError("Not authenticated");
  return { sb: supabaseForUser(ctx), userId };
}

export function fail(message: string): never {
  throw new ToolError(message);
}

export function ok(text: string, data: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text }], structuredContent: JSON.parse(JSON.stringify(data)) };
}

export async function lookups(sb: ReturnType<typeof supabaseForUser>) {
  const [c, a, t] = await Promise.all([
    sb.from("categories").select("id, main, sub, combined"),
    sb.from("accounts").select("id, name, type"),
    sb.from("tags").select("id, name, is_archived"),
  ]);
  const cats = new Map((c.data ?? []).map((x) => [x.id, `${x.main} > ${x.sub}`]));
  const accs = new Map((a.data ?? []).map((x) => [x.id, x.name]));
  const tags = new Map((t.data ?? []).map((x) => [x.id, x.name]));
  return { cats, accs, tags };
}
