import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsInput {
  id: string;
  sender: string;
  body: string;
  occurredAt: number; // epoch ms
}

interface CategoryRef {
  id: string;
  combined: string;
}

interface AccountRef {
  id: string;
  name: string;
  last4?: string | null;
}

interface AiSmsResult {
  id: string;
  isTransaction: boolean;
  amount: number | null;
  type: "debit" | "credit" | null;
  date: string | null; // yyyy-mm-dd
  merchant: string | null;
  description: string | null;
  categoryId: string | null;
  accountId: string | null;
  confidence: number; // 0..1
  reason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, categories, accounts, currency } = await req.json() as {
      messages: SmsInput[];
      categories: CategoryRef[];
      accounts: AccountRef[];
      currency?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "No categories provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const currentYear = new Date().getUTCFullYear();

    const categoryList = categories.map((c) => `- "${c.id}" → ${c.combined}`).join("\n");
    const accountList = (accounts || []).length
      ? accounts
          .map((a) => `- "${a.id}" → ${a.name}${a.last4 ? ` (card ending ${a.last4})` : ""}`)
          .join("\n")
      : "(none)";

    const smsList = messages
      .map((m) => {
        const iso = new Date(m.occurredAt || Date.now()).toISOString();
        return `--- SMS id=${m.id} ---\nSender: ${m.sender}\nReceived: ${iso}\nBody: ${m.body}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a financial SMS parser for a personal expense tracker.
You receive bank/wallet SMS notifications and must extract clean transaction data.

USER'S CATEGORIES (pick the CLOSEST matching id; never invent new ones):
${categoryList}

USER'S ACCOUNTS (match by card last-4 in the SMS, or by bank/wallet name; otherwise null):
${accountList}

CURRENCY: ${currency || "user default"}
CURRENT YEAR: ${currentYear} (use this when the SMS date has no year)

RULES:
1. Set "isTransaction": false for OTPs, promos, balance-only alerts, login alerts,
   future-debit notices, EMI reminders, autopay reminders, and anything that is not a
   completed money movement. For these, leave other fields null.
2. "type" = "debit" for spends (debited, spent, paid, purchase, withdrawn, sent, charged).
   "type" = "credit" for refunds, reversals, cashback, money received, salary, credited.
3. "amount" = absolute number (no currency symbol, no commas).
4. "date" = ISO yyyy-mm-dd. Prefer the transaction date in the SMS body; if missing,
   use the SMS received date. Inject the current year when the body lacks one.
5. "merchant" = the raw merchant/payee as the SMS shows it (e.g. "SWIGGY*BLR").
6. "description" = a clean, human-readable description you would write for the user
   (e.g. "Swiggy order", "ATM withdrawal", "Salary credit", "UPI to Ramesh").
   You MAY rewrite/clarify; keep it faithful to the SMS, no invented detail.
7. "categoryId" = closest match from the list above, or null if truly nothing fits.
8. "accountId" = match using last-4 in the SMS, or the bank/wallet name in the sender
   or body; otherwise null.
9. "confidence" = 0..1 (your own confidence in the extracted transaction).
10. "reason" = brief 3-10 word note (e.g. "Swiggy = Food Delivery").

OUTPUT: a single JSON array, one object per input SMS, in the SAME order and using
the SAME "id" values. Return ONLY the JSON array, no prose, no markdown fences.`;

    const userPrompt = `Parse these ${messages.length} SMS messages:\n\n${smsList}\n\nReturn ONLY the JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResponse = await response.json();
    const content: string = aiResponse.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    let results: AiSmsResult[] = [];
    try {
      results = JSON.parse(jsonStr);
      if (!Array.isArray(results)) throw new Error("AI did not return an array");
    } catch (e) {
      console.error("Failed to parse AI response:", e, content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validCategoryIds = new Set(categories.map((c) => c.id));
    const validAccountIds = new Set((accounts || []).map((a) => a.id));
    results = results.map((r) => ({
      ...r,
      categoryId: r.categoryId && validCategoryIds.has(r.categoryId) ? r.categoryId : null,
      accountId: r.accountId && validAccountIds.has(r.accountId) ? r.accountId : null,
    }));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("parse-sms-transactions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});