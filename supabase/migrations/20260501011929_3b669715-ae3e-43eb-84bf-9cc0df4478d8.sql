-- Enable RLS on tables that were missing it
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_investimentos ENABLE ROW LEVEL SECURITY;

-- Drop hardcoded fake-uuid defaults so the app must pass the real auth.uid()
ALTER TABLE public.despesas ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.meta_ads_investimentos ALTER COLUMN user_id DROP DEFAULT;

-- Owner-scoped policies
CREATE POLICY "Users manage own despesas"
ON public.despesas
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own meta_ads_investimentos"
ON public.meta_ads_investimentos
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- One-shot migration helper: assigns all legacy rows (user_id = '00000000-...')
-- to the calling authenticated user. Safe to call multiple times (no-op after first run).
CREATE OR REPLACE FUNCTION public.claim_legacy_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  legacy uuid := '00000000-0000-0000-0000-000000000000';
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.clientes               SET user_id = uid WHERE user_id = legacy;
  UPDATE public.pedidos                SET user_id = uid WHERE user_id = legacy;
  UPDATE public.galerias               SET user_id = uid WHERE user_id = legacy;
  UPDATE public.pagamentos             SET user_id = uid WHERE user_id = legacy;
  UPDATE public.despesas               SET user_id = uid WHERE user_id = legacy;
  UPDATE public.meta_ads_investimentos SET user_id = uid WHERE user_id = legacy;
  UPDATE public.etiquetas              SET user_id = uid WHERE user_id = legacy;
  UPDATE public.profiles               SET user_id = uid WHERE user_id = legacy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_legacy_data() TO authenticated;