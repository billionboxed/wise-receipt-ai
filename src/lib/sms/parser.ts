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

/**
 * Canonical hash for an SMS. Derived only from raw fields so strict and loose
 * parsers always agree. Normalizes sender casing and trims body to avoid
 * false-misses from trivial whitespace differences.
 */
export function smsHash(sms: RawSms): string {
  const sender = (sms.address || '').toUpperCase().trim();
  const minute = Math.floor((sms.date || 0) / 60000);
  const body = (sms.body || '').trim();
  return djb2(`${sender}|${minute}|${body}`);
}

/**
 * Legacy hash formats we used to write into sms_ingested. Kept so a rescan can
 * still recognize previously-processed SMS and upgrade them to the canonical
 * hash without a DB migration.
 */
export function legacyStrictHash(parsed: {
  amount: number; occurredAt: number; last4: string | null; sender: string; type: 'debit' | 'credit';
}): string {
  const minute = Math.floor(parsed.occurredAt / 60000);
  return djb2(`${parsed.amount.toFixed(2)}|${minute}|${parsed.last4 ?? ''}|${(parsed.sender || '').toUpperCase()}|${parsed.type}`);
}

export function legacyLooseHash(sms: RawSms): string {
  const minute = Math.floor((sms.date || 0) / 60000);
  return djb2(`${(sms.address || '').toUpperCase()}|${minute}|${(sms.body || '').slice(0, 120)}`);
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

  const hash = smsHash(sms);

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

/**
 * Loose parse: never returns null. Extracts whatever it can from the SMS and
 * always yields a candidate with a stable dedupe hash. Use when downstream AI
 * is the source of truth for classification (identifier-matched SMS pipeline).
 */
export function parseSmsLoose(sms: RawSms): ParsedSms {
  const body = sms.body || '';
  const amtMatch = body.match(AMOUNT_RE) ?? body.match(FALLBACK_AMOUNT_RE);
  const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
  const last4Match = body.match(LAST4_RE);
  const last4 = last4Match ? last4Match[1] : null;
  const merchMatch = body.match(MERCHANT_RE);
  let merchant = merchMatch ? merchMatch[1].trim() : (sms.address || 'SMS Transaction');
  merchant = merchant.replace(/\s+on\s+\d.*$/i, '').trim();
  if (merchant.length > 60) merchant = merchant.slice(0, 60);

  const occurredAt = sms.date || Date.now();
  const isoDate = new Date(occurredAt).toISOString().slice(0, 10);
  const isCredit = hasAny(body, CREDIT_WORDS) && !hasAny(body, DEBIT_WORDS);
  const type: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';
  const hash = smsHash(sms);

  return { amount, type, date: isoDate, merchant, last4, sender: sms.address || '', raw: body, occurredAt, hash };
}

/** Loose batch parse — always yields a candidate for every input. */
export function parseSmsBatchLoose(messages: RawSms[]): ParsedSms[] {
  const out: ParsedSms[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    const p = parseSmsLoose(m);
    if (seen.has(p.hash)) continue;
    seen.add(p.hash);
    out.push(p);
  }
  return out;
}