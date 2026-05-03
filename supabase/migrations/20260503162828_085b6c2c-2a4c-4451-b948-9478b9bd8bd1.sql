
-- indicacoes table
CREATE TABLE public.indicacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  codigo text NOT NULL UNIQUE,
  recompensa_tipo text NOT NULL DEFAULT 'percentual',
  recompensa_valor numeric NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'aguardando',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own indicacoes"
ON public.indicacoes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read indicacao by code"
ON public.indicacoes FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER update_indicacoes_updated_at
BEFORE UPDATE ON public.indicacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- indicacao_leads table
CREATE TABLE public.indicacao_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  indicacao_id uuid NOT NULL REFERENCES public.indicacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.indicacao_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own indicacao_leads"
ON public.indicacao_leads FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public insert lead via indicacao"
ON public.indicacao_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.indicacoes i
    WHERE i.id = indicacao_leads.indicacao_id
      AND i.user_id = indicacao_leads.user_id
  )
);

-- profiles columns for program settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS indicacao_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS indicacao_modo text NOT NULL DEFAULT 'desconto',
  ADD COLUMN IF NOT EXISTS indicacao_tipo text NOT NULL DEFAULT 'percentual',
  ADD COLUMN IF NOT EXISTS indicacao_valor numeric NOT NULL DEFAULT 10;

-- Update legacy claim function
CREATE OR REPLACE FUNCTION public.claim_legacy_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  UPDATE public.retiradas              SET user_id = uid WHERE user_id = legacy;
  UPDATE public.indicacoes             SET user_id = uid WHERE user_id = legacy;
  UPDATE public.indicacao_leads        SET user_id = uid WHERE user_id = legacy;
END;
$function$;
