
CREATE TABLE public.sms_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sms_hash text NOT NULL,
  sms_sender text,
  sms_raw text,
  occurred_at timestamptz,
  parsed_date date NOT NULL,
  parsed_amount numeric(14,2) NOT NULL,
  parsed_type text NOT NULL DEFAULT 'debit',
  suggested_description text,
  suggested_category_id uuid,
  suggested_account_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sms_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_pending TO authenticated;
GRANT ALL ON public.sms_pending TO service_role;

ALTER TABLE public.sms_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_pending select own" ON public.sms_pending
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sms_pending insert own" ON public.sms_pending
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sms_pending update own" ON public.sms_pending
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sms_pending delete own" ON public.sms_pending
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER sms_pending_updated_at
  BEFORE UPDATE ON public.sms_pending
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX sms_pending_user_status_idx ON public.sms_pending (user_id, status, parsed_date DESC);

CREATE TABLE public.sms_ingested (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sms_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sms_hash)
);

GRANT SELECT, INSERT, DELETE ON public.sms_ingested TO authenticated;
GRANT ALL ON public.sms_ingested TO service_role;

ALTER TABLE public.sms_ingested ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_ingested select own" ON public.sms_ingested
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sms_ingested insert own" ON public.sms_ingested
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sms_ingested delete own" ON public.sms_ingested
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
