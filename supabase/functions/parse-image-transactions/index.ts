import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, fileName, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare the image URL for the vision model
    const imageUrl = `data:${mimeType || 'image/png'};base64,${imageBase64}`;

    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toISOString().split('T')[0];
    
    const systemPrompt = `You are a financial document parser specializing in extracting transaction data from bank statements, receipts, and financial screenshots.

Current date: ${currentDate}
Current year: ${currentYear}

Your task is to analyze the image and extract ALL visible transactions.

For each transaction, extract:
1. date - in YYYY-MM-DD format. IMPORTANT: If only day/month is visible, assume the current year (${currentYear}) unless context suggests otherwise. For dates like "9th Jan" or "Jan 9", use ${currentYear}-01-09.
2. description - the merchant name or transaction description
3. amount - as a positive number (remove currency symbols)
4. type - "debit" for withdrawals/purchases, "credit" for deposits/refunds
5. suggestedCategory - one of: Food & Dining, Shopping, Transportation, Bills & Utilities, Entertainment, Health, Travel, Education, Personal Care, Home, Gifts & Donations, Business, Investments, Misc

Also detect:
- detectedAccount: The bank/card name if visible (e.g., "Chase", "HDFC", "Kotak")
- currency: The currency code if identifiable (e.g., "USD", "INR", "CAD")

IMPORTANT:
- Extract ALL transactions visible in the image
- For amounts: Remove currency symbols, convert to numbers
- For dates: Convert to YYYY-MM-DD format, use ${currentYear} as default year
- Negative amounts or withdrawals = "debit"
- Positive amounts, deposits, refunds, or "CR" = "credit"

Return ONLY valid JSON, no markdown or explanation.`;

    const userPrompt = `Extract all transactions from this bank statement/receipt image. Return as JSON:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Merchant/Description",
      "amount": 123.45,
      "type": "debit|credit",
      "suggestedCategory": "Category"
    }
  ],
  "detectedAccount": "Bank Name or null",
  "currency": "USD"
}

Analyze the image and extract every transaction you can see.`;

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
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsedData;
    try {
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

      parsedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse transaction data from image');
    }

    // Validate and clean the transactions
    const transactions = (parsedData.transactions || []).map((t: any) => ({
      date: t.date || new Date().toISOString().split('T')[0],
      description: String(t.description || 'Unknown').trim(),
      amount: Math.abs(parseFloat(t.amount) || 0),
      type: t.type === 'credit' ? 'credit' : 'debit',
      suggestedCategory: t.suggestedCategory || 'Misc',
    })).filter((t: any) => t.amount > 0);

    console.log(`Parsed ${transactions.length} transactions from image: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transactions,
          detectedAccount: parsedData.detectedAccount || null,
          currency: parsedData.currency || 'USD',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing image:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse image',
        hint: 'Make sure the image is clear and shows transaction details. Try a screenshot with better resolution.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
