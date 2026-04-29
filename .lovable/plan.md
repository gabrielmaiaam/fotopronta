## Gestão Financeira Completa

Implementação dividida em duas partes: melhorias na página de **Pagamentos** (com DRE e despesas recorrentes) e nova página **Meta Ads** com ROI/ROAS.

---

### 1. Database — Novas tabelas e colunas

**Migration nova:**

```sql
-- 1. Origem do cliente no pedido
ALTER TABLE pedidos ADD COLUMN origem_cliente text;
-- valores: 'meta_ads' | 'indicacao' | 'instagram_organico' | 'whatsapp_direto' | 'outro'

-- 2. Despesas recorrentes mensais
CREATE TABLE despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'outro',
  -- 'ferramenta_ia' | 'marketing' | 'infraestrutura' | 'outro'
  recorrente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE despesas DISABLE ROW LEVEL SECURITY;

-- 3. Investimentos Meta Ads
CREATE TABLE meta_ads_investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  data date NOT NULL,
  valor_investido numeric NOT NULL DEFAULT 0,
  taxa_imposto numeric NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE meta_ads_investimentos DISABLE ROW LEVEL SECURITY;

-- 4. Configuração da taxa padrão de imposto Meta Ads no profile
ALTER TABLE profiles ADD COLUMN meta_ads_taxa_imposto numeric NOT NULL DEFAULT 14;
```

> Despesas marcadas como `recorrente=true` aparecem automaticamente em todo mês corrente. Editar o valor cria/atualiza o registro base; o histórico mensal é apresentado pelo valor atual (modelo simples — sem snapshot mensal).

---

### 2. Página Pedidos — campo Origem

Em `src/pages/Pedidos.tsx`, modais de criar e editar:
- Adicionar `<Select>` obrigatório "Origem do cliente" com 5 opções (ícones via emoji no label).
- Persistir em `pedidos.origem_cliente`.
- Mostrar a origem como pequena badge na tabela (coluna existente "Cliente" com sub-texto, sem nova coluna para evitar saturação).

---

### 3. Página Pagamentos — reformulação

`src/pages/Pagamentos.tsx`:

**Cards de resumo (4 cards):**
- 💵 Receita do Mês — soma de `pagamentos.valor_pago` no mês corrente
- 💸 Despesas do Mês — soma de `despesas.valor`
- 💰 Lucro Líquido — receita − despesas (verde se ≥0, vermelho se <0)
- 📊 Margem de Lucro — `(lucro / receita) × 100`

**Seção "Despesas do Mês":**
- Botão `+ Nova Despesa` abre modal: Nome, Valor (R$), Categoria.
- Lista em cards com nome, categoria (badge), valor editável inline, botão excluir.
- Total no rodapé.

**Seção "DRE Simplificado":**
- Filtro mês/ano (selects).
- Tabela: Receita Bruta, Despesas, Lucro Líquido, Margem.
- Bloco "Receita por origem":
  - Veio de Anúncios (Meta Ads): R$ X
  - Veio Orgânico (resto): R$ X
- Cálculo via join `pagamentos → pedidos.origem_cliente` filtrado por `pago` no mês.

A lista atual de pagamentos individuais é mantida abaixo do DRE.

---

### 4. Nova página Meta Ads

**Arquivo novo:** `src/pages/MetaAds.tsx`
**Rota:** `/meta-ads` em `src/App.tsx`
**Sidebar:** Adicionar item entre Pagamentos e Configurações em `src/components/AppSidebar.tsx` (ícone `TrendingUp` ou `Megaphone` do lucide).

**Cards de resumo (mês corrente):**
- 💸 Investido no Mês — soma `meta_ads_investimentos.valor_investido`
- 🏦 Imposto Meta — `investido × taxa%`
- 💵 Retorno — soma `pagamentos.valor_pago` onde `pedidos.origem_cliente='meta_ads'` no mês
- 💰 Lucro — `retorno − investido − imposto`
- 📈 ROI — `(lucro / investido) × 100`
- ⚡ ROAS — `retorno / investido`

**Seção "Lançamentos do mês":**
- Botão `+ Registrar Investimento` → modal com Data + Valor.
- Lista: data, investido, imposto (calculado), retorno (atribuído ao mês — não por lançamento).

**Tabela histórica:**
- Filtro: 3 / 6 / 12 meses.
- Linhas agrupadas por mês: Mês | Investido | Imposto | Retorno | Lucro | ROI | ROAS.
- Linha TOTAL no rodapé.

**Configuração:**
- Input editável "Taxa de imposto (%)" salvando em `profiles.meta_ads_taxa_imposto`. Aplica-se a todos os cálculos exibidos (a taxa em cada lançamento histórico fica congelada na coluna `taxa_imposto` se já gravada).

---

### 5. Arquivos modificados/criados

- **migration** nova com SQL acima
- `src/pages/Pedidos.tsx` — campo origem nos 2 modais + insert/update
- `src/pages/Pagamentos.tsx` — reescrita com despesas + DRE
- `src/pages/MetaAds.tsx` — **novo**
- `src/App.tsx` — rota `/meta-ads`
- `src/components/AppSidebar.tsx` — item de menu
- `src/integrations/supabase/types.ts` — atualizado automaticamente após a migration

Todos os cálculos no front-end via agregação dos dados retornados pelo Supabase (sem RPCs, mantendo o padrão atual do projeto).
