import type { supabaseForUser } from "./supabase";

type Sb = ReturnType<typeof supabaseForUser>;

export async function loadMemory(sb: Sb) {
  const [p, r] = await Promise.all([
    sb.from("assistant_preferences").select("id, text").order("created_at"),
    sb.from("merchant_rules").select("id, merchant_pattern, category_id, account_id, tag_ids").order("merchant_pattern"),
  ]);
  return { preferences: p.data ?? [], merchant_rules: r.data ?? [] };
}

/** Duplicate rule shared with statement import: same date + same integer amount. */
export async function findDuplicates(sb: Sb, date: string, amount: number) {
  const n = Math.trunc(amount);
  const { data } = await sb
    .from("transactions")
    .select("id, date, description, amount, account_id")
    .eq("date", date)
    .gte("amount", n)
    .lt("amount", n + 1);
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
}
