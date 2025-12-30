import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      console.error('No PDF data provided');
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF:', fileName);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert financial document parser specializing in Indian bank statements. Your task is to extract transactions from bank statement PDFs.

IMPORTANT GUIDELINES:
1. Extract ALL transactions from the document
2. For each transaction, identify:
   - date: In YYYY-MM-DD format
   - description: The transaction narration/description
   - amount: The transaction amount (positive number)
   - type: Either "debit" (withdrawal/expense) or "credit" (deposit/income)

3. Detect the bank/account from the document if possible. Common Indian banks:
   - Kotak Mahindra Bank -> "Kotak Bank"
   - ICICI Bank Credit Card -> "ICICI Credit Card"
   - HDFC Bank Credit Card -> "HDFC Credit Card"
   - Axis Bank Credit Card -> "Axis Credit Card"

4. Suggest categories based on transaction descriptions:
   - Food-related (Zomato, Swiggy, restaurants) -> "Food"
   - Fuel (petrol pumps, HP, Indian Oil) -> "Fuel"
   - Groceries (BigBazaar, DMart) -> "Household"
   - Entertainment (Netflix, Spotify, PVR) -> "Entertainment" or "Subscriptions"
   - Travel (flights, hotels, MakeMyTrip) -> "Vacation"
   - Medical/pharmacy -> "Health"
   - Shopping/apparel -> "Apparel"
   - Utilities/bills -> "Household"
   - Default -> "Misc"

Return a JSON object with this exact structure:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "ZOMATO ORDER",
      "amount": 450.00,
      "type": "debit",
      "suggestedCategory": "Food"
    }
  ],
  "detectedAccount": "Kotak Bank" or null,
  "totalTransactions": 10
}

ONLY return valid JSON, no markdown or explanations.`;

    console.log('Calling Lovable AI for PDF parsing...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: 'Extract all transactions from this bank statement PDF. Return the data as JSON.' 
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty AI response');
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received, parsing JSON...');

    // Clean up the response - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    try {
      const parsedData = JSON.parse(cleanContent);
      console.log(`Successfully parsed ${parsedData.transactions?.length || 0} transactions`);
      
      return new Response(
        JSON.stringify({ success: true, data: parsedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Content was:', cleanContent.substring(0, 500));
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse transaction data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in parse-pdf-transactions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
