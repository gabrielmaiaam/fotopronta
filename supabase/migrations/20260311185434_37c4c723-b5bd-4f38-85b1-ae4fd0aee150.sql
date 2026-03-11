ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marca_dagua_tipo text NOT NULL DEFAULT 'imagem',
  ADD COLUMN IF NOT EXISTS marca_dagua_texto text,
  ADD COLUMN IF NOT EXISTS marca_dagua_texto_cor text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS marca_dagua_texto_tamanho integer NOT NULL DEFAULT 24;