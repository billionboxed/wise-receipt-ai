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
    const { currentTotal, projectedTotal, historicalAvg, daysElapsed, daysInMonth, currency } = await req.json();
    
    console.log("Forecast request:", { currentTotal, projectedTotal, historicalAvg, daysElapsed, daysInMonth, currency });
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const percentComplete = (daysElapsed / daysInMonth * 100).toFixed(0);
    const percentOfAvg = historicalAvg > 0 ? ((projectedTotal / historicalAvg) * 100).toFixed(0) : 'N/A';
    const dailyRate = daysElapsed > 0 ? (currentTotal / daysElapsed) : 0;

    const prompt = `You are a personal finance analyst. Given this spending data, provide ONE concise insight (max 2 sentences):

Current month spending: ${currency} ${currentTotal.toLocaleString()}
Days elapsed: ${daysElapsed}/${daysInMonth} (${percentComplete}%)
Projected end-of-month: ${currency} ${Math.round(projectedTotal).toLocaleString()}
Historical monthly average: ${currency} ${Math.round(historicalAvg).toLocaleString()}
Spending vs average: ${percentOfAvg}%
Daily spending rate: ${currency} ${Math.round(dailyRate).toLocaleString()}

Focus on: spending trend, comparison to average, or actionable advice. Be specific with numbers. Don't be generic.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || null;
    
    console.log("Generated insight:", insight);

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
