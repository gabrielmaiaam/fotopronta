# Dashboard enxuto

Reescrita do `src/pages/Dashboard.tsx` em 3 seções, removendo todo o resto.

## Remover
- Seção "Recomendações Inteligentes" (componente `RecCard` também)
- Linha 1 (Faturamento Hoje/Semana/Mês + Lucro)
- Linha 2 (Ticket Médio, Despesas, Retirado, Margem)
- Linha "Resumo extra" atual

## Seção 1 — Gráfico de Receita
Card grande no topo.
- Título "Receita" + subtítulo dinâmico ("Hoje", "Últimos 7 dias", "Últimos 30 dias", "Este mês")
- Toggle no canto superior direito: `Hoje | 7 dias | 30 dias | Este mês` (ativo em `bg-primary`)
- Valor total do período em destaque logo abaixo do título (`text-3xl`)
- `AreaChart` (recharts) com a evolução da receita:
  - **Hoje** → agrupado por hora (0–23h)
  - **7 dias** / **30 dias** → por dia
  - **Este mês** → por dia do mês corrente
- Fonte: `pagamentos` com `status='pago'`, somando `valor_pago` por bucket, filtrando por `updated_at || created_at`
- Vazio: "Nenhuma venda neste período"

## Seção 2 — 5 cards em linha
Grid `grid-cols-2 md:grid-cols-5`:
1. 💰 Lucro Líquido do Mês (verde/vermelho) — receita do mês − despesas do mês (mesma fórmula atual: fixas + Meta Ads c/ imposto)
2. 🖼️ Galerias — total cadastradas
3. 👥 Clientes — total cadastrados
4. ⏰ Pedidos Pendentes — pedidos cujo `status` ≠ `pronto`/`finalizado` (manter critério atual: `status !== 'pronto'`)
5. ✅ Pedidos Pagos — pagamentos com `status='pago'` no mês atual

## Seção 3 — Galerias Recentes
Mantida como está (tabela com últimas 5: Título | Cliente | Status | Valor).

## Detalhes técnicos
- `loadData` simplificado: buscar apenas `galerias` (id + recentes), `clientes` (id), `pedidos` (id, status), `pagamentos` (*), `despesas` (*), `meta_ads_investimentos` (*), `profiles` (taxa). Remover `retiradas` e fórmulas de distribuição.
- Helper `bucketize(pagamentos, periodo)` retorna `[{label, valor}]` para o `AreaChart`.
- Reaproveitar tokens existentes (`hsl(var(--primary))`, `text-success`, `text-destructive`).
- Espaçamento generoso: `space-y-8` no container raiz.

## Arquivo afetado
- `src/pages/Dashboard.tsx`
