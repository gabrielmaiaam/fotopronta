ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS modo_pagamento text NOT NULL DEFAULT 'entrada_saldo',
  ADD COLUMN IF NOT EXISTS percentual_entrada numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS entrada_paga_em timestamptz,
  ADD COLUMN IF NOT EXISTS saldo_pago_em timestamptz,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';