## Atualização da página Meta Ads

Adicionar colunas **Faturado** e **Lucro** à tabela "Lançamentos do mês" e 4 cards de totais no rodapé. Nada existente será removido.

---

### 1. Tabela "Lançamentos de [mês]"

Nova estrutura de colunas:

```
Data | Investido | Imposto (14%) | Faturado | Lucro | Ações
```

- **Faturado (por dia)**: soma de `pagamentos.valor_pago` onde `status = 'pago'`, `pedidos.origem_cliente = 'meta_ads'` e a data do pagamento (`updated_at`/`created_at`) é igual à data do lançamento.
- **Lucro (por dia)**: `Faturado − Investido` (sem subtrair imposto, conforme pedido). Verde se ≥ 0, vermelho se < 0.
- A coluna "Retorno (mês)" atual (que repetia o total mensal em cada linha) será substituída pela coluna **Faturado** com cálculo correto por dia.
- Manter botão de excluir na coluna **Ações**.

### 2. Rodapé da tabela — 4 cards de totais do mês corrente

```
[💸 Total Investido] [💵 Total Faturado] [💰 Total Lucro] [📈 ROI do Mês]
```

- **Total Investido**: soma de `valor_investido` no mês.
- **Total Faturado**: soma dos pagamentos Meta Ads no mês.
- **Total Lucro**: `Total Faturado − Total Investido` (verde/vermelho).
- **ROI do Mês**: `(Total Lucro ÷ Total Investido) × 100` (verde/vermelho; "—" se investido = 0).

### 3. Filtro

A página já filtra por mês corrente (`startOfMonth`/`endOfMonth`). Os novos cálculos usam o mesmo intervalo, então o filtro continuará funcionando para todas as colunas, incluindo Faturado e Lucro.

### 4. Preservado sem alteração

- Cards de resumo do topo (6 cards: Investido, Imposto, Retorno, Lucro, ROI, ROAS).
- Tabela "Histórico Mensal" com seletor 3/6/12 meses.
- Card "Configuração" da taxa de imposto.
- Modal "Registrar Investimento".

---

### Detalhes técnicos

- Arquivo único: `src/pages/MetaAds.tsx`.
- Helper por dia:
  ```ts
  const faturadoNoDia = (dataISO: string) =>
    pagamentos
      .filter(p => p.pedidos?.origem_cliente === "meta_ads")
      .filter(p => format(new Date(p.updated_at || p.created_at), "yyyy-MM-dd") === dataISO)
      .reduce((s, p) => s + Number(p.valor_pago), 0);
  ```
- Cards de rodapé renderizados dentro do mesmo `<Card>` da tabela "Lançamentos", abaixo do `<Table>`, em `grid grid-cols-2 md:grid-cols-4 gap-3`.
- Sem mudanças de schema, sem migrations.
