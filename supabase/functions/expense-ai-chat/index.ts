import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, expenseContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an intelligent expense tracker assistant. You help users:
1. Analyze their spending patterns and provide insights
2. Add new expenses when they describe them
3. Answer questions about their financial data

Current expense data context:
${JSON.stringify(expenseContext, null, 2)}

When the user wants to add an expense, extract these details and respond with a JSON block:
- date (YYYY-MM-DD format, default to today if not specified)
- description (what was purchased)
- amount (number only)
- type ("debit" for expenses, "credit" for income)
- suggestedCategory (suggest from available categories if possible, or leave empty)

IMPORTANT: Always add the expense even if no category is specified. The user can select a category later. Never refuse to add an expense due to missing category.

Format expense additions like this:
\`\`\`expense
{
  "action": "add_expense",
  "date": "2025-01-01",
  "description": "Fuel",
  "amount": 1000,
  "type": "debit",
  "suggestedCategory": "Transportation"
}
\`\`\`

Always include the expense JSON block when the user wants to add an expense. After the JSON block, briefly confirm what you're about to add.

For insights, analyze the spending patterns, identify trends, suggest savings opportunities, and highlight unusual spending.

Be concise, helpful, and conversational. Use the ₹ symbol for amounts.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
