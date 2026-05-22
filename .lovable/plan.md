# Reestruturação completa da página Financeiro

A página `/financeiro` (arquivo `src/pages/Pagamentos.tsx`) será reorganizada em 3 partes, mantendo todos os dados atuais e somente adicionando estrutura. A página de Meta Ads continua existindo, mas o investimento mensal passa a entrar também como "Despesa Variável" para unificar a lógica de fluxo de caixa.

## Parte 1 — Despesas (fixas e variáveis)

### Migração no Supabase (tabela `despesas`)
Adicionar colunas (sem apagar dados):
- `dia_vencimento` integer (1–31), default `1`
- `tipo` text ('fixa' | 'variavel'), default `'fixa'`
- `status_mes` jsonb, default `'{}'::jsonb` — armazena `{ "2026-05": "pago", "2026-04": "nao_pago" }`
- Adicionar valores à categoria: passa a aceitar também `saude` e `educacao` (campo já é text, basta atualizar lista no front)

Migração de dados existentes:
- Toda despesa cujo nome contenha "Meta Ads" → `tipo = 'variavel'`
- Demais despesas → `tipo = 'fixa'`
- `dia_vencimento = 1` para todas
- `status_mes = '{}'`

### UI — duas seções separadas

**Despesas Fixas 📌**
- Tabela: Nome | Categoria | Dia Venc. | Valor | Status do mês | Ações
- Botão toggle "✅ Pago / ❌ Não pago" que grava em `status_mes[YYYY-MM]`
- Badge 🔔 quando faltam ≤3 dias para vencer (mês selecionado = mês atual)
- Badge "VENCIDA" vermelho se hoje > dia_vencimento e ainda não pago no mês atual
- Botão "+ Nova Despesa Fixa"

**Despesas Variáveis 📊**
- Mesma estrutura, mas coluna Valor é editável inline por mês (armazenar em `status_mes[YYYY-MM]` como objeto `{ status, valor }`)
- Botão "+ Nova Despesa Variável"

### Modal "Nova Despesa"
Campos: Nome · Categoria (Ferramenta de IA, Marketing, Infraestrutura, Saúde, Educação, Outro) · Tipo (Fixa/Variável) · Dia de vencimento (1–31) · Valor · Salvar.

## Parte 2 — Fluxo de Caixa Anual

Nova seção abaixo de Despesas. Tabela com 12 meses do ano selecionado:

```text
Mês | Saldo Inicial | (+) Entradas | (-) Saídas | Saldo Final
```

- **Entradas** = soma de `pagamentos.valor_pago` com `status='pago'` no mês
- **Saídas** = despesas fixas marcadas como pagas no mês + valor mensal das variáveis + Meta Ads (`meta_ads_investimentos × (1 + taxa)`)
- **Saldo Inicial** = Saldo Final do mês anterior, exceto Janeiro (input manual, salvo em `profiles.saldo_inicial_ano` como jsonb `{ "2026": 1500 }`)
- **Saldo Final** = Inicial + Entradas − Saídas (verde se positivo, vermelho se negativo)
- Mês atual destacado (borda primária)
- Select para trocar ano (anos com dados + ano atual + próximo)

Migração extra: adicionar coluna `saldo_inicial_ano jsonb default '{}'::jsonb` em `profiles`.

## Parte 3 — Melhorias gerais

**Cards de resumo no topo** (já existem, atualizar fórmulas):
- 💵 Faturamento do Mês
- 💸 Total Despesas do Mês (fixas pagas no mês + variáveis do mês)
- 💰 Lucro Líquido (verde/vermelho)
- 📊 Margem de Lucro (%)

**Alertas do Mês** (novo, abaixo dos cards):
- Lista despesas fixas com vencimento nos próximos 5 dias e ainda não pagas no mês atual
- Formato: `🔔 [Nome] vence dia [X] — R$ [valor]`
- Vazio: `✅ Nenhuma despesa vencendo em breve`

**Filtro mês/ano global** no topo da página afeta: cards, alertas, DRE, status das despesas. (Fluxo de caixa usa só o ano.)

**Mantido sem alteração**: DRE Simplificado (passa a ler novos campos), Distribuição do Lucro, Retiradas, página Meta Ads.

## Arquivos afetados
- `src/pages/Pagamentos.tsx` — reestruturação principal
- Migração SQL: `despesas` (3 colunas + UPDATE), `profiles` (1 coluna)
- Possíveis novos componentes auxiliares: `DespesasTable.tsx`, `FluxoCaixaTable.tsx`, `AlertasMes.tsx` (para manter o arquivo enxuto)

## Detalhes técnicos
- `status_mes` unificado para fixas e variáveis: para variáveis o valor do mês fica em `status_mes[YYYY-MM].valor`; quando ausente, cai no `valor` base da despesa
- Toggle pago/não pago faz `UPDATE despesas SET status_mes = jsonb_set(...)` via supabase-js
- Fluxo de Caixa é calculado client-side a partir de pagamentos + despesas já carregados
