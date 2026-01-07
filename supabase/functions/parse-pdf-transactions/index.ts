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

const systemPrompt = `You are an expert financial document parser specializing in bank and credit card statements from ANY country worldwide. Your task is to extract transactions from bank statement PDFs accurately.

CRITICAL GUIDELINES:
1. Extract ALL transactions from the document - do not skip any
2. Handle various date formats and convert to YYYY-MM-DD:
   - MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-Mon-YYYY, etc.
   - Use context clues (country, bank) to determine date format
3. For each transaction, identify:
   - date: In YYYY-MM-DD format (required)
   - description: The transaction narration/description (required)
   - amount: The transaction amount as POSITIVE number always (required)
   - type: Either "debit" (withdrawal/expense/purchase) or "credit" (deposit/income/refund)

SMART REFUND/CREDIT DETECTION (CRITICAL):
Detect credits and refunds using these worldwide patterns - this is essential for accurate categorization:

1. NEGATIVE SIGN: Amount shown as -100.00 or (100.00) → type: "credit"
2. CREDIT/CR INDICATOR: Column header or label says "Credit" or "CR" → type: "credit"  
3. DEBIT/DR INDICATOR: If statement uses DR/CR columns, DR = debit, CR = credit
4. DESCRIPTION KEYWORDS - Mark as type "credit" if description contains:
   - "REFUND", "CREDIT", "REVERSAL", "RETURN", "CASHBACK", "REBATE"
   - "PAYMENT RECEIVED", "PAYMENT THANK YOU", "PAYMENT - THANK YOU"
   - "ADJUSTMENT CREDIT", "DISPUTE CREDIT", "CHARGEBACK"
   - "REWARDS", "BONUS", "INTEREST EARNED", "DIVIDEND"
   - "DEPOSIT", "TRANSFER IN", "INCOMING"
5. PAYMENT SECTION: Transactions in "Payments", "Credits", or "Money In" sections → type: "credit"
6. STATEMENT FORMAT PATTERNS:
   - American Express: Negative amounts (e.g., -2,811.96) are credits/payments
   - Chase/BoA: May use separate columns for debits and credits
   - UK Banks: Often use "IN" and "OUT" or "Credit" and "Debit" columns
   - Indian Banks: May use "Cr" and "Dr" suffixes or separate columns
   - Australian Banks: Often use +/- or separate Credit/Debit columns

IMPORTANT: 
- If amount is negative OR in credit column OR has credit indicator → type: "credit"
- Always return amount as positive number, let the "type" field indicate direction
- When in doubt based on description (PAYMENT, REFUND, etc.), mark as credit

4. Detect the bank/account from the document. Common banks by region:

   CANADA:
   - Royal Bank of Canada, RBC -> "RBC"
   - Toronto-Dominion Bank, TD -> "TD Bank"
   - Bank of Montreal, BMO -> "BMO"
   - Scotiabank -> "Scotiabank"
   - CIBC -> "CIBC"
   - National Bank -> "National Bank"
   - Tangerine -> "Tangerine"
   - Simplii -> "Simplii"
   
   USA:
   - Chase, JPMorgan -> "Chase"
   - Bank of America, BofA -> "Bank of America"
   - Wells Fargo -> "Wells Fargo"
   - Citibank, Citi -> "Citibank"
   - Capital One -> "Capital One"
   - American Express, Amex -> "Amex"
   - Discover -> "Discover"
   
   INDIA:
   - Kotak Mahindra Bank -> "Kotak Bank"
   - ICICI Bank -> "ICICI Bank"
   - HDFC Bank -> "HDFC Bank"
   - Axis Bank -> "Axis Bank"
   - State Bank of India, SBI -> "SBI"
   
   UK:
   - Barclays -> "Barclays"
   - HSBC -> "HSBC"
   - Lloyds -> "Lloyds"
   - NatWest -> "NatWest"
   - Monzo -> "Monzo"
   - Revolut -> "Revolut"
   
   AUSTRALIA:
   - Commonwealth Bank, CBA -> "Commonwealth Bank"
   - ANZ -> "ANZ"
   - Westpac -> "Westpac"
   - NAB -> "NAB"

   For credit cards, append "Credit Card" (e.g., "RBC Credit Card", "Chase Credit Card")

5. Suggest categories based on transaction descriptions (universal):
   - Food/Dining (restaurants, DoorDash, UberEats, Zomato, Swiggy, McDonald's, Starbucks) -> "Food"
   - Groceries (Walmart, Costco, Loblaws, Safeway, Whole Foods, Metro, No Frills, BigBazaar, DMart) -> "Household"
   - Fuel/Gas (Shell, Esso, Petro-Canada, Chevron, BP, gas station, petrol) -> "Fuel"
   - Entertainment (Netflix, Spotify, Disney+, Apple Music, cinema, movies, gaming) -> "Entertainment" or "Subscriptions"
   - Travel (airlines, Expedia, Booking.com, Airbnb, hotels, flights) -> "Vacation"
   - Transportation (Uber, Lyft, taxi, transit, parking) -> "Fuel"
   - Medical/Health (pharmacy, doctor, hospital, dental) -> "Health"
   - Shopping/Retail (Amazon, eBay, clothing stores) -> "Apparel"
   - Utilities (electricity, water, internet, phone, hydro) -> "Household"
   - Insurance -> "Insurance"
   - Transfers between accounts -> "Transfers"
   - ATM withdrawals -> "Misc"
   - Default for unrecognized -> "Misc"

6. Handle edge cases:
   - If amount has currency symbol, extract just the number
   - If a transaction spans multiple lines, combine into single description
   - For pending transactions, still include them
   - Ignore header rows, summary rows, and balance information

Return a JSON object with this exact structure:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "STARBUCKS #12345",
      "amount": 5.75,
      "type": "debit",
      "suggestedCategory": "Food"
    }
  ],
  "detectedAccount": "RBC Credit Card" or null,
  "totalTransactions": 10,
  "detectedCurrency": "CAD" or "USD" or "INR" or null
}

ONLY return valid JSON, no markdown or explanations. If you cannot parse the document, return {"transactions": [], "detectedAccount": null, "totalTransactions": 0, "error": "reason"}.`;

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
      
      // Validate and sanitize the parsed data
      if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
        parsedData.transactions = [];
      }
      
      // Clean up transactions - ensure all required fields exist
      parsedData.transactions = parsedData.transactions.map((t: any, index: number) => ({
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || `Transaction ${index + 1}`,
        amount: typeof t.amount === 'number' ? Math.abs(t.amount) : parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0,
        type: t.type === 'credit' ? 'credit' : 'debit',
        suggestedCategory: t.suggestedCategory || 'Misc'
      })).filter((t: any) => t.amount > 0); // Filter out zero/invalid amounts
      
      parsedData.totalTransactions = parsedData.transactions.length;
      
      console.log(`Successfully parsed ${parsedData.transactions.length} transactions from ${parsedData.detectedAccount || 'unknown bank'}`);
      
      // Check if AI returned an error message
      if (parsedData.error && parsedData.transactions.length === 0) {
        console.error('AI parsing error:', parsedData.error);
        return new Response(
          JSON.stringify({ success: false, error: `Could not parse statement: ${parsedData.error}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, data: parsedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Content was:', cleanContent.substring(0, 1000));
      
      // Try to extract any transaction-like data from the response
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to parse the bank statement. Please ensure the PDF is a valid bank or credit card statement with readable text.',
          hint: 'Try uploading a clearer PDF or use Excel/CSV format for better results.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
