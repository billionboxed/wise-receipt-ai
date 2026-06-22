import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurringExpense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
  category_id: string | null;
  account_id: string | null;
  tag_ids: string[];
  day_of_month: number;
  is_active: boolean;
  last_added_date: string | null;
}

function shouldAddTransaction(expense: RecurringExpense, today: Date): boolean {
  const todayDay = today.getDate();
  const lastAdded = expense.last_added_date ? new Date(expense.last_added_date) : null;

  // Check if the day of month matches (or closest valid day for short months)
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(expense.day_of_month, lastDayOfMonth);

  if (todayDay !== targetDay) {
    return false;
  }

  // If never added, add it
  if (!lastAdded) {
    return true;
  }

  const daysSinceLastAdded = Math.floor(
    (today.getTime() - lastAdded.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (expense.frequency) {
    case "weekly":
      return daysSinceLastAdded >= 7;
    case "biweekly":
      return daysSinceLastAdded >= 14;
    case "monthly":
      return daysSinceLastAdded >= 28;
    case "quarterly":
      return daysSinceLastAdded >= 84;
    default:
      return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    console.log(`Processing recurring expenses for ${todayStr}`);

    // Get all active recurring expenses
    const { data: expenses, error: fetchError } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching recurring expenses:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expenses?.length || 0} active recurring expenses`);

    const results: { added: number; skipped: number; errors: string[] } = {
      added: 0,
      skipped: 0,
      errors: [],
    };

    for (const expense of expenses || []) {
      try {
        if (!shouldAddTransaction(expense, today)) {
          console.log(`Skipping ${expense.description}: not due today`);
          results.skipped++;
          continue;
        }

        console.log(`Adding transaction for ${expense.description}`);

        // Create the transaction with recurring_expense_id to track the source
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: expense.user_id,
          date: todayStr,
          description: expense.description,
          amount: expense.amount,
          type: "debit",
          category_id: expense.category_id,
          account_id: expense.account_id,
          tag_ids: expense.tag_ids || [],
          recurring_expense_id: expense.id,
          source: "recurring",
          sms_reviewed: true,
        });

        if (insertError) {
          console.error(`Error inserting transaction for ${expense.description}:`, insertError);
          results.errors.push(`${expense.description}: ${insertError.message}`);
          continue;
        }

        // Update the last_added_date
        const { error: updateError } = await supabase
          .from("recurring_expenses")
          .update({ last_added_date: todayStr })
          .eq("id", expense.id);

        if (updateError) {
          console.error(`Error updating last_added_date for ${expense.description}:`, updateError);
          results.errors.push(`${expense.description} (update): ${updateError.message}`);
          continue;
        }

        results.added++;
        console.log(`Successfully added transaction for ${expense.description}`);
      } catch (err) {
        console.error(`Error processing ${expense.description}:`, err);
        results.errors.push(`${expense.description}: ${String(err)}`);
      }
    }

    console.log(`Finished processing. Added: ${results.added}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in process-recurring-expenses:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
