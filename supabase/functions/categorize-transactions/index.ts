import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface Category {
  id: string;
  main: string;
  sub: string;
  combined: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, categories } = await req.json() as {
      transactions: Transaction[];
      categories: Category[];
    };

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transactions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "No categories provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build category reference for AI
    const categoryList = categories.map(c => `- ID: "${c.id}" → ${c.combined}`).join("\n");

    // Build transaction list for AI
    const transactionList = transactions.map((t, i) => 
      `${i + 1}. ID: "${t.id}" | "${t.description}" | Amount: ${t.amount} | Date: ${t.date}`
    ).join("\n");

    const systemPrompt = `You are an expert financial transaction categorizer. Your task is to match bank transaction descriptions to the most appropriate category from the user's category list.

AVAILABLE CATEGORIES:
${categoryList}

CATEGORIZATION RULES:
1. Match transactions to the MOST SPECIFIC subcategory when possible
2. Consider the merchant name, keywords, and transaction context
3. Common patterns:
   - Food delivery apps (Zomato, Swiggy, DoorDash, UberEats) → Food > Delivery or similar
   - Grocery stores → Household > Groceries
   - Fuel stations → Transportation > Fuel
   - Streaming services → Subscriptions > Streaming
   - Restaurants/cafes → Food > Dining Out
   - Online shopping (Amazon, Flipkart) → Shopping > Online Shopping
   - Pharmacies → Health > Pharmacy
   - Ride-share (Uber, Ola, Lyft) → Transportation > Ride Share
   - Electricity/water/gas bills → Household > Bills & Utilities
   - ATM withdrawals → Misc > ATM & Cash
   - Bank fees → Misc > Fees & Charges
4. If uncertain, choose the closest main category
5. Only use category IDs from the provided list

OUTPUT FORMAT:
Return a JSON array with objects containing:
- "id": the transaction ID
- "categoryId": the matched category ID from the list
- "confidence": "high", "medium", or "low"
- "reason": brief explanation (max 10 words)

Example:
[
  {"id": "tx_1", "categoryId": "cat_123", "confidence": "high", "reason": "Netflix is a streaming service"},
  {"id": "tx_2", "categoryId": "cat_456", "confidence": "medium", "reason": "Appears to be restaurant"}
]`;

    const userPrompt = `Categorize these transactions:

${transactionList}

Return ONLY the JSON array, no other text.`;

    console.log(`Categorizing ${transactions.length} transactions with ${categories.length} categories`);

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
        temperature: 0.1, // Low temperature for consistent categorization
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the AI response
    let suggestions: Array<{ id: string; categoryId: string; confidence: string; reason: string }> = [];
    
    try {
      // Clean up potential markdown formatting
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      suggestions = JSON.parse(jsonStr);
      
      // Validate that all category IDs exist
      const validCategoryIds = new Set(categories.map(c => c.id));
      suggestions = suggestions.map(s => ({
        ...s,
        categoryId: validCategoryIds.has(s.categoryId) ? s.categoryId : categories[0]?.id || "",
      }));

    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      // Return empty suggestions on parse failure
      suggestions = transactions.map(t => ({
        id: t.id,
        categoryId: categories.find(c => c.main === "Misc")?.id || categories[0]?.id || "",
        confidence: "low",
        reason: "Fallback due to parsing error",
      }));
    }

    console.log(`Successfully categorized ${suggestions.length} transactions`);

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Categorization error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
