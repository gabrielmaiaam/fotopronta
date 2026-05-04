
CREATE TABLE public.pacotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  icone text NOT NULL DEFAULT '📦',
  quantidade_fotos integer NOT NULL DEFAULT 1,
  preco numeric NOT NULL DEFAULT 0,
  beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pacotes"
ON public.pacotes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_pacotes_updated_at
BEFORE UPDATE ON public.pacotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
  UPDATE public.pacotes                SET user_id = uid WHERE user_id = legacy;
END;
$function$;
