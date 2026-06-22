-- Add source tracking and SMS-specific fields to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS sms_sender TEXT,
  ADD COLUMN IF NOT EXISTS sms_raw TEXT,
  ADD COLUMN IF NOT EXISTS sms_reviewed BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual','upload','sms','recurring'));

CREATE INDEX IF NOT EXISTS idx_transactions_source
  ON public.transactions(user_id, source);

-- Sender allowlist (which SMS senders the user opted-in to monitor)
CREATE TABLE IF NOT EXISTS public.sms_sender_allowlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sender)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_sender_allowlist TO authenticated;
GRANT ALL ON public.sms_sender_allowlist TO service_role;

ALTER TABLE public.sms_sender_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS senders"
  ON public.sms_sender_allowlist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own SMS senders"
  ON public.sms_sender_allowlist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own SMS senders"
  ON public.sms_sender_allowlist FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own SMS senders"
  ON public.sms_sender_allowlist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_sms_sender_allowlist_updated_at
  BEFORE UPDATE ON public.sms_sender_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Card last-4 -> account mapping for SMS routing
CREATE TABLE IF NOT EXISTS public.account_card_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  last4 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, last4)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_card_map TO authenticated;
GRANT ALL ON public.account_card_map TO service_role;

ALTER TABLE public.account_card_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card map"
  ON public.account_card_map FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own card map"
  ON public.account_card_map FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own card map"
  ON public.account_card_map FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own card map"
  ON public.account_card_map FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_account_card_map_updated_at
  BEFORE UPDATE ON public.account_card_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User SMS preferences (opt-in toggle + default fallback account)
CREATE TABLE IF NOT EXISTS public.sms_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_preferences TO authenticated;
GRANT ALL ON public.sms_preferences TO service_role;

ALTER TABLE public.sms_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS prefs"
  ON public.sms_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own SMS prefs"
  ON public.sms_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own SMS prefs"
  ON public.sms_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own SMS prefs"
  ON public.sms_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_sms_preferences_updated_at
  BEFORE UPDATE ON public.sms_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
