import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ToolDef {
  name: string;
  description: string;
  parameters: unknown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tools, systemContext } = await req.json() as {
      messages: any[];
      tools: ToolDef[];
      systemContext?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are ClearSpends, an in-app AI assistant that can BOTH answer questions about the user's spending AND take actions on their behalf by calling tools.

Rules:
- Prefer calling a tool over asking clarifying questions when the intent is clear.
- Use list_* tools to discover IDs before mutating. Never invent IDs.
- For bulk or destructive actions (scan_sms, delete_account, purge_deleted_sms_all, confirm_pending_sms_bulk), the app will require the user to approve; still call the tool with the correct arguments.
- After running SMS scans or listing pending SMS, briefly summarize results and offer next steps ("confirm all"/"confirm one by one"/"delete #3").
- Currency is ${systemContext ? "user-configured" : "unspecified"}; do not invent one.
- Keep replies short and specific. When a tool returns data, refer to it directly.

Context:
${systemContext ?? "(no extra context)"}`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const openAiTools = (tools || []).map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: fullMessages,
        tools: openAiTools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message ?? { role: "assistant", content: "" };

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("agent-chat error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});