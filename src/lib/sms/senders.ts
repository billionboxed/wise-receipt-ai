// Built-in seed list of common bank / card SMS sender IDs.
// Sender IDs in India / global commonly look like "HDFCBK", "VK-HDFCBK", "AX-ICICIB", "SBIINB", etc.
// We match by a short alphanumeric "core" extracted from the raw sender.

export const DEFAULT_BANK_SENDERS = [
  'HDFCBK', 'HDFC', 'SBIINB', 'SBI', 'SBIUPI', 'CBSSBI',
  'ICICIB', 'ICICI', 'AXISBK', 'AXIS', 'KOTAKB', 'KOTAK',
  'YESBNK', 'IDFCFB', 'INDUSB', 'PNBSMS', 'BOBSMS', 'CANBNK',
  'CITIBK', 'AMEX', 'HSBC', 'SCBANK', 'DBSBNK', 'RBLBNK',
  'PAYTMB', 'AIRTEL', 'AUBANK', 'FEDBNK', 'IOBCHN', 'UNIONB',
  // Card networks / wallets
  'AMAZONP', 'PAYTM', 'PHONPE', 'GPAY', 'MOBKWK', 'FREECH',
] as const;

/** Normalize sender ID (drop "VK-", "AX-" prefixes, uppercase). */
export function normalizeSender(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/^[A-Z]{2}-/i, '').toUpperCase().trim();
  // Some carriers append numbers, strip trailing digits
  return cleaned.replace(/[^A-Z]/g, '');
}

export function isLikelyBankSender(raw: string): boolean {
  const norm = normalizeSender(raw);
  if (!norm) return false;
  return DEFAULT_BANK_SENDERS.some(s => norm.includes(s));
}