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
- Use the IDs listed in the Context below to resolve names → IDs. Only call list_* tools when the requested item is not in Context. Never invent IDs.
- Categories are stored as "Main > Sub" pairs (one row per pair). A bare main name like "Household" is NOT a category by itself — it maps to several sub-categories.
  - If the user names only a main (e.g. "household"), and there is exactly one matching "Main > Sub" row, use it and state the full "Main > Sub" name in your reply.
  - If there are multiple matches, DO NOT guess. List the matching sub-categories numbered and ask which one (e.g. "1. Household > Groceries  2. Household > Utilities  3. Household > Rent").
  - If none match, offer to create one with add_category(main, sub) and ask for the sub name.
- When adding/editing, always show the resolved category as "Main > Sub" (never just the main, never the id).
- For bulk or destructive actions (scan_sms, delete_account, delete_category, delete_tag, purge_deleted_sms_all, confirm_pending_sms_bulk, delete_pending_sms_bulk, reapply_identifiers), the app will require the user to approve; still call the tool with the correct arguments.
- Currency is ${systemContext ? "user-configured" : "unspecified"}; do not invent one.

Reply format after any tool call — ALWAYS resolve IDs to human names using Context; NEVER show raw UUIDs or "updated: true" style output. Use the correct verb — a pending SMS is a DRAFT until confirmed, never call it a "transaction" until confirm_pending_sms runs:
- After edit_pending_sms: "Draft updated — <Description> · <amount> · <Main > Sub> · <Account> · <date>. Still pending — say 'confirm' to add it to your transactions."
- After confirm_pending_sms: "✓ Added to transactions — <Description> · <amount> · <Main > Sub> · <Account> · <date>."
- After add_expense / update_expense: "✓ <verb> transaction — <Description> · <amount> · <Main > Sub> · <Account> · <date>."
- After delete_pending_sms: "Moved draft to Deleted SMS — <Description>. Say 'restore' to bring it back."
- Never say "the transaction is updated/confirmed/added" for anything that only touched sms_pending.
- After add_* / rename_* / delete_*: one short line naming what changed by its human name (not its id).
- After list_* / get_*: a compact bulleted or numbered list. For pending/deleted SMS use:
  "1. <Description> — <amount> · <Category or 'Uncategorized'> · <Account or 'Unassigned'> · <date>"
  and remember the numbering so the user can say "confirm #2" or "delete #3".
- After scan_sms: "Scanned X messages · Y new pending · Z auto-cleaned." then offer next steps.
- Keep replies to 1–3 short lines. No JSON, no ids, no "tool succeeded" phrasing.

Context (authoritative IDs — use these to resolve names):
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