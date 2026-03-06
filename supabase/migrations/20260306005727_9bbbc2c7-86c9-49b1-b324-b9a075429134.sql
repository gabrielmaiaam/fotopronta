
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  plano TEXT NOT NULL DEFAULT 'Free',
  chave_pix TEXT,
  nome_recebedor TEXT,
  cidade TEXT,
  marca_dagua_url TEXT,
  marca_dagua_opacidade INTEGER NOT NULL DEFAULT 24,
  marca_dagua_tamanho INTEGER NOT NULL DEFAULT 15,
  marca_dagua_posicao TEXT NOT NULL DEFAULT 'repetir',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clients" ON public.clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Galerias table
CREATE TABLE public.galerias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo_ensaio TEXT,
  pacote TEXT,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_avulso NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'previa',
  link_publico TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.galerias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own galleries" ON public.galerias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public gallery access by link" ON public.galerias FOR SELECT USING (link_publico IS NOT NULL);

CREATE TRIGGER update_galerias_updated_at BEFORE UPDATE ON public.galerias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fotos table
CREATE TABLE public.fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  galeria_id UUID NOT NULL REFERENCES public.galerias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_com_marca_dagua TEXT,
  aprovada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own photos" ON public.fotos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.galerias g WHERE g.id = galeria_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.galerias g WHERE g.id = galeria_id AND g.user_id = auth.uid()));
CREATE POLICY "Public photo access" ON public.fotos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.galerias g WHERE g.id = galeria_id AND g.link_publico IS NOT NULL));

-- Pedidos table
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico TEXT NOT NULL,
  tipo_ensaio TEXT,
  pacote TEXT,
  data_entrega TIMESTAMPTZ,
  tempo_estimado_minutos INTEGER NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'aguardando',
  express BOOLEAN NOT NULL DEFAULT false,
  link_comprovante TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own orders" ON public.pedidos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pagamentos table
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own payments" ON public.pagamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_pagamentos_updated_at BEFORE UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('marca-dagua', 'marca-dagua', true);

-- Storage policies
CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public can view photos" ON storage.objects FOR SELECT USING (bucket_id IN ('fotos', 'marca-dagua'));
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'fotos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload watermark" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'marca-dagua' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update watermark" ON storage.objects FOR UPDATE USING (bucket_id = 'marca-dagua' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete watermark" ON storage.objects FOR DELETE USING (bucket_id = 'marca-dagua' AND auth.uid()::text = (storage.foldername(name))[1]);
