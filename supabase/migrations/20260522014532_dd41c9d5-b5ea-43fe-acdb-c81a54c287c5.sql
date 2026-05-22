ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS dia_vencimento integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'fixa',
  ADD COLUMN IF NOT EXISTS status_mes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.despesas
  ADD CONSTRAINT despesas_dia_vencimento_check CHECK (dia_vencimento BETWEEN 1 AND 31),
  ADD CONSTRAINT despesas_tipo_check CHECK (tipo IN ('fixa','variavel'));

UPDATE public.despesas SET tipo = 'variavel' WHERE nome ILIKE '%meta ads%';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saldo_inicial_ano jsonb NOT NULL DEFAULT '{}'::jsonb;