## Integrar Meta Ads como despesa automática no Financeiro

### Abordagem
A linha "📢 Meta Ads" no Financeiro é **calculada em runtime** a partir da tabela `meta_ads_investimentos` — não é gravada como despesa real. Isso garante:
- Fonte única da verdade (sem duplicação)
- Atualização automática quando muda em Meta Ads
- Impossível editar/excluir do Financeiro (não existe registro real)

### Mudanças em `src/pages/Pagamentos.tsx`

1. Carregar também `meta_ads_investimentos` e `profiles.meta_ads_taxa_imposto` no `loadAll()`.

2. Para o mês corrente (cards de topo) e para o mês selecionado no DRE, calcular:
   ```
   metaInvestidoMes = soma valor_investido no intervalo
   metaImpostoMes   = metaInvestidoMes * (taxa / 100)
   metaTotalMes     = metaInvestidoMes + metaImpostoMes
   ```

3. Renderizar na lista de Despesas do Mês uma linha virtual no topo (apenas se `metaTotalMes > 0`):
   - Nome: "📢 Meta Ads"
   - Badge: "Marketing"
   - Valor em texto (não editável)
   - Sem botão de excluir
   - Pequena tag "Automático" + tooltip "Calculado a partir dos lançamentos em Meta Ads"

4. Atualizar todos os cálculos para somar `metaTotalMes`:
   - Card "Despesas do Mês"
   - Card "Lucro Líquido" e "Margem"
   - Total no rodapé da seção de despesas
   - Linha "Despesas do Mês" do DRE Simplificado (usando `metaTotalMes` do mês filtrado, não do mês corrente)

### Sem mudanças em
- Schema do banco (sem migration)
- `src/pages/MetaAds.tsx` (apenas opcionalmente uma nota informativa)

### Arquivos
- `src/pages/Pagamentos.tsx`