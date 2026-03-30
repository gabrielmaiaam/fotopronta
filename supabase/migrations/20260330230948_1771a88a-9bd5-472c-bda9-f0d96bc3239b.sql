
-- Tabela de etiquetas
CREATE TABLE public.etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#5B7FFF',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own etiquetas" ON public.etiquetas
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabela junction cliente_etiquetas
CREATE TABLE public.cliente_etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  etiqueta_id uuid NOT NULL REFERENCES public.etiquetas(id) ON DELETE CASCADE,
  UNIQUE (cliente_id, etiqueta_id)
);

ALTER TABLE public.cliente_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cliente_etiquetas" ON public.cliente_etiquetas
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM public.etiquetas e WHERE e.id = etiqueta_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.etiquetas e WHERE e.id = etiqueta_id AND e.user_id = auth.uid()
  ));
