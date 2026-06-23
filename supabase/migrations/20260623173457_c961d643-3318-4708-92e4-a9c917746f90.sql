CREATE TABLE public.account_sms_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  identifier text NOT NULL CHECK (length(trim(identifier)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX account_sms_identifiers_unique
  ON public.account_sms_identifiers (user_id, account_id, lower(identifier));

CREATE INDEX account_sms_identifiers_user_idx
  ON public.account_sms_identifiers (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_sms_identifiers TO authenticated;
GRANT ALL ON public.account_sms_identifiers TO service_role;

ALTER TABLE public.account_sms_identifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own SMS identifiers"
  ON public.account_sms_identifiers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Backfill from existing account_card_map last4 values
INSERT INTO public.account_sms_identifiers (user_id, account_id, identifier)
SELECT user_id, account_id, last4
FROM public.account_card_map
ON CONFLICT DO NOTHING;