## Parte 1 — Nova identidade visual (dark azul)

Toda a paleta do app vem de tokens HSL em `src/index.css`. Trocando os tokens, a mudança propaga para todas as páginas e componentes (sidebar, botões, inputs, cards, sliders, foco, hovers). Não há cores douradas hardcoded fora dos tokens.

Novos valores em `src/index.css` (mapeando para as cores pedidas):

```text
--background        → #0a0f1e
--foreground        → #94a3b8  (texto geral)
--card              → #111827
--card-foreground   → #f0f4ff
--popover           → #111827
--border            → #1e2d45
--input             → #111827
--muted             → #1a2d4a
--muted-foreground  → #4a6080  (texto secundário)
--primary           → #3b82f6  (substitui dourado)
--primary-foreground→ #ffffff
--accent            → #1a2d4a  (hover/itens ativos)
--accent-foreground → #3b82f6
--ring              → #3b82f6
--sidebar-background→ #0d1526
--sidebar-accent    → #1a2d4a
--sidebar-primary   → #3b82f6
```

Ajustes adicionais:
- Logo "Foto Pronta" em `AppSidebar.tsx`: texto branco (`text-[#f0f4ff]`), ícone mantém `text-primary` (azul).
- Hover de botão primário usa `hover:bg-primary/90` — definir `--primary` já em #3b82f6 deixa o hover em ~#2563eb naturalmente (ou ajustar para `hover:bg-[#2563eb]` no `button.tsx` se necessário).
- Itens ativos do menu já usam `bg-sidebar-accent` + `text-primary` — passa a ficar #1a2d4a + #3b82f6 automaticamente.

## Parte 2 — Reestruturação financeira

### 2A. Schema (nova migration)

Tabela `retiradas`:
```sql
create table public.retiradas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  data date not null default current_date,
  valor numeric not null default 0,
  descricao text,
  created_at timestamptz not null default now()
);
alter table public.retiradas enable row level security;
create policy "Users manage own retiradas" on public.retiradas
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Adicionar em `profiles`:
```sql
alter table public.profiles
  add column distribuicao_pro_labore  int not null default 50,
  add column distribuicao_reinvest    int not null default 30,
  add column distribuicao_reserva     int not null default 20,
  add column meta_faturamento_mensal  numeric not null default 0;
```

Atualizar `claim_legacy_data()` para incluir `update public.retiradas ...`.

### 2B. Dashboard (`src/pages/Dashboard.tsx`)

Remover o card único de Receita com filtro de período. Adicionar dois grids fixos:

Linha 1 (4 cards):
- Faturamento Hoje
- Faturamento da Semana (últimos 7 dias)
- Faturamento do Mês
- Lucro Líquido do Mês (receita do mês − despesas fixas − Meta Ads do mês)

Linha 2 (4 cards):
- Ticket Médio = receita total ÷ nº pedidos pagos
- Total Despesas do Mês (fixas + Meta Ads integrado)
- Total Retirado do mês (soma de `retiradas`)
- % Margem de Lucro do mês

Seção "Recomendações Inteligentes" abaixo dos cards:
- Lê `distribuicao_pro_labore/reinvest/reserva` do profile.
- Mostra 3 linhas com os valores sugeridos a partir do lucro líquido do mês.
- Lucro ≤ 0 → aviso vermelho.
- Sem dados (sem pagamentos e sem despesas) → mensagem neutra.

Manter "Galerias Recentes". Remover gráfico de área de receita (substituído pelos cards/Relatórios).

### 2C. Página Financeiro (`src/pages/Pagamentos.tsx`)

Manter despesas, DRE, lista de pagamentos. Atualizar/adicionar:

Cards de topo (4): Faturamento Total (mês), Total Despesas (mês), Total Retiradas (mês), Lucro Líquido (mês). Substitui o quarto card atual (Margem) — margem fica no DRE.

Nova seção "Retiradas (Pró-labore)" abaixo das despesas:
- Botão "+ Nova Retirada" → modal (Data, Valor, Descrição).
- Lista de retiradas do mês corrente.
- Total do mês.

Nova seção "Distribuição do Lucro":
- 3 inputs numéricos (% Pró-labore / Reinvest / Reserva), validação soma = 100.
- Botão "Salvar configuração" → update no `profiles`.
- 3 cards coloridos com R$ sugerido com base no lucro líquido do mês.

Nova seção "Meta mensal":
- Input para `meta_faturamento_mensal`, botão salvar.
- Barra de progresso (`<Progress />`) com % atingido; ao ≥ 100 mostra "🎉 Meta do mês atingida!".

DRE atualizado para incluir as linhas pedidas (Receita Bruta, → Anúncios, → Orgânico, Total Despesas, → Meta Ads, → Despesas Fixas, Lucro Líquido, Total Retiradas, Saldo na Empresa = Lucro − Retiradas, Margem). O filtro mês/ano atual é mantido; retiradas e despesas usam o intervalo do filtro.

### 2D. Nova página Relatórios (`src/pages/Relatorios.tsx`)

Filtro global: Últimos 3 / 6 / 12 meses (default 6).

- Gráfico 1: Barras — faturamento mensal (recharts `BarChart`, agregando `pagamentos` pagos por mês).
- Gráfico 2: Pizza — origem das vendas (Meta Ads / Orgânico / Indicação / Outros) lendo `pedidos.origem_cliente` (com fallback "Outros").
- Gráfico 3: Barras — despesas por categoria (Ferramenta de IA / Marketing / Infraestrutura / Outro).
- Gráfico 4: Linha — evolução do lucro líquido mês a mês.
- Tabela de Histórico de Retiradas (Data | Descrição | Valor) com total no rodapé.

### 2E. Menu lateral (`src/components/AppSidebar.tsx` + `src/App.tsx`)

Nova ordem e item "Relatórios" entre Financeiro e Meta Ads:
1. Dashboard 2. Clientes 3. Pedidos 4. Galerias 5. Prévia Rápida 6. Financeiro 7. Relatórios 8. Meta Ads 9. Configurações.

Adicionar rota `/relatorios → <Relatorios />` em `App.tsx`.

## Arquivos a criar/editar

- `src/index.css` — novos tokens HSL azuis.
- `src/components/AppSidebar.tsx` — reordenar menu, adicionar Relatórios, ajustar logo.
- `src/App.tsx` — registrar rota `/relatorios`.
- `src/pages/Dashboard.tsx` — substituir cards e adicionar Recomendações Inteligentes.
- `src/pages/Pagamentos.tsx` — novos cards, seções Retiradas / Distribuição / Meta, DRE atualizado.
- `src/pages/Relatorios.tsx` — nova página com 4 gráficos + tabela de retiradas.
- `supabase/migrations/<timestamp>_retiradas_e_distribuicao.sql` — tabela `retiradas`, colunas em `profiles`, atualização de `claim_legacy_data()`.

Sem duplicação: Retiradas só são cadastradas em Financeiro; Dashboard e Relatórios apenas leem. Distribuição do Lucro é configurada em Financeiro e consumida em Dashboard. Meta Ads continua sendo lançada na página Meta Ads e entra automaticamente nas despesas.
