import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface RecurringExpense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
  category_id: string | null;
  account_id: string | null;
  tag_ids: string[] | null;
  day_of_month: number | null;
  last_added_date: string | null;
  created_at: string;
}

const fmt = (d: Date) => d.toISOString().split("T")[0];
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const clampDay = (y: number, m: number, day: number) =>
  utc(y, m, Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()));

/** All due dates after last_added (or from creation) up to and including today. */
export function dueDates(e: RecurringExpense, today: Date): string[] {
  const out: string[] = [];
  const day = e.day_of_month || 1;
  const last = e.last_added_date ? new Date(e.last_added_date + "T00:00:00Z") : null;
  const start = new Date(e.created_at.slice(0, 10) + "T00:00:00Z");
  const MAX = 60;

  if (e.frequency === "monthly" || e.frequency === "quarterly") {
    const step = e.frequency === "monthly" ? 1 : 3;
    let y: number, m: number;
    if (last) {
      y = last.getUTCFullYear(); m = last.getUTCMonth() + step;
    } else {
      y = start.getUTCFullYear(); m = start.getUTCMonth();
      if (clampDay(y, m, day) < start) m += 1;
    }
    while (out.length < MAX) {
      const d = clampDay(y + Math.floor(m / 12), ((m % 12) + 12) % 12, day);
      if (d > today) break;
      out.push(fmt(d));
      m += step;
    }
  } else {
    const step = e.frequency === "weekly" ? 7 : 14;
    let d = last ? new Date(last.getTime() + step * 86400000) : start;
    while (d <= today && out.length < MAX) {
      out.push(fmt(d));
      d = new Date(d.getTime() + step * 86400000);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Optional: scope to the signed-in user when a user JWT is supplied.
    let userId: string | null = null;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await admin.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    }

    const now = new Date();
    const today = utc(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let q = admin.from("recurring_expenses").select("*").eq("is_active", true);
    if (userId) q = q.eq("user_id", userId);
    const { data: expenses, error } = await q;
    if (error) throw error;

    const results = { added: 0, skipped: 0, errors: [] as string[] };

    for (const e of (expenses || []) as RecurringExpense[]) {
      const dates = dueDates(e, today);
      if (!dates.length) { results.skipped++; continue; }

      const { data: existing } = await admin
        .from("transactions").select("date")
        .eq("recurring_expense_id", e.id).in("date", dates);
      const have = new Set((existing || []).map((r) => r.date));
      const rows = dates.filter((d) => !have.has(d)).map((d) => ({
        user_id: e.user_id, date: d, description: e.description, amount: e.amount,
        type: "debit", category_id: e.category_id, account_id: e.account_id,
        tag_ids: e.tag_ids || [], recurring_expense_id: e.id,
        source: "recurring", sms_reviewed: true,
      }));

      if (rows.length) {
        const { error: insErr } = await admin.from("transactions").insert(rows);
        if (insErr) { results.errors.push(`${e.description}: ${insErr.message}`); continue; }
        results.added += rows.length;
      }
      await admin.from("recurring_expenses")
        .update({ last_added_date: dates[dates.length - 1] }).eq("id", e.id);
    }

    console.log("recurring results", results);
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-recurring-expenses error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
