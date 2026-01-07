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

    const systemPrompt = `You are an expert financial analyst with deep knowledge of global merchants, brands, and services. Your task is to intelligently categorize bank transaction descriptions.

AVAILABLE CATEGORIES:
${categoryList}

YOUR APPROACH:
1. **Analyze the description** - Look for merchant names, abbreviations, transaction codes, and patterns
2. **Use your knowledge** - You know about thousands of businesses worldwide:
   - Retail chains (Walmart, Target, Costco, Tesco, Carrefour, Big Bazaar, D-Mart)
   - Restaurants & cafes (Starbucks, McDonald's, Subway, local chains)
   - E-commerce (Amazon, Flipkart, eBay, Alibaba, Shopee)
   - Streaming (Netflix, Spotify, Disney+, Apple Music, YouTube Premium)
   - Ride-share (Uber, Lyft, Ola, Grab, DiDi)
   - Food delivery (DoorDash, UberEats, Zomato, Swiggy, Deliveroo)
   - Airlines, hotels, travel agencies
   - Utilities, telecom providers, insurance companies
   - Banks, payment processors, fintech services
   - Healthcare providers, pharmacies, fitness centers
   
3. **Decode abbreviations** - Bank statements often use abbreviated names:
   - "AMZN" = Amazon
   - "APPL" = Apple
   - "GOOGL" = Google
   - "MSFT" = Microsoft
   - "POS" = Point of sale purchase
   - "ATM" = Cash withdrawal
   - "ACH" = Automated clearing house
   - "EFT" = Electronic funds transfer
   
4. **Understand transaction patterns**:
   - Recurring same-amount charges = likely subscriptions
   - Round numbers at gas stations = fuel
   - Small amounts at cafes = coffee/snacks
   - Large amounts at electronics stores = electronics
   - Payments to utilities with city names = bills

5. **International awareness** - Recognize merchants from:
   - USA, Canada, UK, Australia
   - India (Paytm, PhonePe, HDFC, ICICI, Reliance, etc.)
   - Europe, Asia, and other regions

DECISION PROCESS:
- If you recognize the merchant → high confidence
- If the pattern strongly suggests a category → medium confidence  
- If uncertain but making educated guess → low confidence
- Always pick the MOST SPECIFIC matching subcategory

OUTPUT FORMAT (JSON array only):
[
  {"id": "tx_id", "categoryId": "matching_category_id", "confidence": "high|medium|low", "reason": "brief 5-10 word explanation"}
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
