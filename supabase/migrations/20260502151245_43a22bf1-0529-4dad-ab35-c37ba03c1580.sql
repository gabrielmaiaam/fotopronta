CREATE TABLE public.retiradas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT current_date,
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.retiradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own retiradas"
ON public.retiradas FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.profiles
  ADD COLUMN distribuicao_pro_labore int NOT NULL DEFAULT 50,
  ADD COLUMN distribuicao_reinvest int NOT NULL DEFAULT 30,
  ADD COLUMN distribuicao_reserva int NOT NULL DEFAULT 20,
  ADD COLUMN meta_faturamento_mensal numeric NOT NULL DEFAULT 0;

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
END;
$function$;