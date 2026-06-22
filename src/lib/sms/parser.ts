// Pure SMS parser. No platform dependencies — unit-testable.

export interface RawSms {
  id?: string;
  address: string;       // sender
  body: string;          // message text
  date: number;          // epoch ms
}

export interface ParsedSms {
  amount: number;
  type: 'debit' | 'credit';
  date: string;          // ISO yyyy-MM-dd
  merchant: string;
  last4: string | null;
  sender: string;
  raw: string;
  occurredAt: number;
  /** Stable dedupe hash. */
  hash: string;
}

const DEBIT_WORDS = ['debited', 'spent', 'paid', 'purchase', 'withdrawn', 'sent', 'transferred', 'charged'];
const CREDIT_WORDS = ['credited', 'received', 'refund', 'refunded', 'reversed', 'cashback'];
const REJECT_WORDS = ['otp', 'one time password', 'one-time password', 'do not share', 'verification code', 'expires in', 'autopay', 'will be debited on', 'will be charged on'];
const BAL_ONLY = /(avl|available|closing|outstanding)\s*bal/i;

const AMOUNT_RE = /(?:rs\.?|inr|₹|usd|eur|gbp|\$|€|£)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const FALLBACK_AMOUNT_RE = /\b([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{2})\b/;
const LAST4_RE = /(?:card|a\/c|acct|account|xx+|\*+)[^\d]{0,6}(\d{4})\b/i;
const MERCHANT_RE = /(?:at|to|towards|for|@)\s+([A-Z0-9][A-Z0-9 .&'\-]{2,40})/i;

function hasAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some(n => lower.includes(n));
}

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/** Extract a transaction from a single SMS, or null if it does not look like one. */
export function parseSms(sms: RawSms): ParsedSms | null {
  const body = sms.body || '';
  if (!body) return null;

  // Reject OTP / promo / future-pay alerts
  if (hasAny(body, REJECT_WORDS)) return null;

  const isCredit = hasAny(body, CREDIT_WORDS);
  const isDebit = hasAny(body, DEBIT_WORDS);
  if (!isCredit && !isDebit) return null;

  // Balance-only alerts without a txn verb
  if (BAL_ONLY.test(body) && !isCredit && !isDebit) return null;

  // Extract amount
  const amtMatch = body.match(AMOUNT_RE) ?? body.match(FALLBACK_AMOUNT_RE);
  if (!amtMatch) return null;
  const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
  if (!isFinite(amount) || amount <= 0) return null;

  const last4Match = body.match(LAST4_RE);
  const last4 = last4Match ? last4Match[1] : null;

  const merchMatch = body.match(MERCHANT_RE);
  let merchant = merchMatch ? merchMatch[1].trim() : (sms.address || 'SMS Transaction');
  // Trim trailing words like "on 12-06-25"
  merchant = merchant.replace(/\s+on\s+\d.*$/i, '').trim();
  if (merchant.length > 60) merchant = merchant.slice(0, 60);

  const occurredAt = sms.date || Date.now();
  const d = new Date(occurredAt);
  const isoDate = d.toISOString().slice(0, 10);

  const type: 'debit' | 'credit' = isCredit && !isDebit ? 'credit' : 'debit';

  // Dedupe hash: amount + minute-bucket + last4 + sender
  const minute = Math.floor(occurredAt / 60000);
  const hash = djb2(`${amount.toFixed(2)}|${minute}|${last4 ?? ''}|${(sms.address || '').toUpperCase()}|${type}`);

  return {
    amount,
    type,
    date: isoDate,
    merchant,
    last4,
    sender: sms.address || '',
    raw: body,
    occurredAt,
    hash,
  };
}

/** Run a batch of SMS through the parser, dropping nulls. */
export function parseSmsBatch(messages: RawSms[]): ParsedSms[] {
  const out: ParsedSms[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    const p = parseSms(m);
    if (!p) continue;
    if (seen.has(p.hash)) continue;
    seen.add(p.hash);
    out.push(p);
  }
  return out;
}