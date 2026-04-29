ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS origem_cliente text;

CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'outro',
  recorrente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_despesas_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meta_ads_investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  data date NOT NULL,
  valor_investido numeric NOT NULL DEFAULT 0,
  taxa_imposto numeric NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meta_ads_investimentos DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS meta_ads_taxa_imposto numeric NOT NULL DEFAULT 14;