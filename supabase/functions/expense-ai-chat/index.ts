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
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Support both request formats:
    // Format 1 (ExpenseAIChat.tsx): { messages, expenseContext }
    // Format 2 (AIChat.tsx): { message, context, conversationHistory }
    let chatMessages: Array<{ role: string; content: string }> = [];
    let expenseContext = body.expenseContext || body.context || {};

    if (body.messages && Array.isArray(body.messages)) {
      // Format 1: messages array from ExpenseAIChat
      chatMessages = body.messages;
    } else if (body.message) {
      // Format 2: single message with conversationHistory from AIChat
      const history = body.conversationHistory || [];
      chatMessages = [
        ...history.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: body.message },
      ];
    }

    console.log("Processing chat request with", chatMessages.length, "messages");

    const systemPrompt = `You are an expert AI financial assistant with COMPLETE ACCESS to the user's expense data. You are like having a personal financial analyst who knows every transaction, pattern, and spending habit.

## YOUR CAPABILITIES:
You can answer ANY question about the user's finances including:
- Total spending (all-time, yearly, monthly, weekly, daily)
- Category analysis (which categories they spend most on, trends over time)
- Tag analysis (project costs, archived tags, spending patterns)
- Account breakdowns (credit card vs bank spending)
- Transaction search (find specific expenses by description, amount, date)
- Trend analysis (month-over-month changes, seasonal patterns)
- Top expenses and outliers
- Average transaction amounts
- Spending forecasts and comparisons

## USER'S COMPLETE FINANCIAL DATA:
${JSON.stringify(expenseContext, null, 2)}

## DATA STRUCTURE EXPLANATION:
- allTransactions: EVERY single expense with date, description, amount, category, account, and tags
- categorySpending: Breakdown by category with total, count, and average per transaction
- monthlyByCategory: Last 6 months spending by category for trend analysis
- yearlySpending: Total spending per year
- monthlySpending: Total spending per month
- tagSpending: Spending by tag including archived/project status
- accountSpending: Spending by account with type (credit/bank)
- topExpenses: 10 highest value transactions
- recentTransactions: 20 most recent transactions
- availableCategories: All category options (main > sub format)
- availableTags: All tags with archived/project status
- availableAccounts: All accounts with type

## HOW TO ANSWER QUESTIONS:
1. USE THE DATA PROVIDED - you have access to everything!
2. For questions about archived tags: check availableTags where isArchived=true
3. For project spending: check tagSpending where isProject=true
4. For yearly totals: use yearlySpending object
5. For category trends: use monthlyByCategory
6. For specific transactions: search through allTransactions
7. Always provide specific numbers from the data

## ADDING EXPENSES:
When user wants to add an expense, respond with:
\`\`\`expense
{
  "action": "add_expense",
  "date": "YYYY-MM-DD",
  "description": "what was purchased",
  "amount": number,
  "type": "debit",
  "suggestedCategory": "Category name if obvious"
}
\`\`\`

## RESPONSE STYLE:
- Be concise but informative
- Always use ₹ symbol for amounts
- Format large numbers with commas (e.g., ₹1,50,000)
- Provide context and insights, not just raw numbers
- If asked something you can calculate from the data, DO IT
- Never say you don't have access to data - YOU HAVE EVERYTHING`;

    const shouldStream = Array.isArray(body.messages);

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
          ...chatMessages,
        ],
        stream: shouldStream,
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

    if (shouldStream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ response: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
