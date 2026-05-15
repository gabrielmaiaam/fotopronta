
# Ajustes em Pedidos e Pagamentos

## Parte 1 — Modal de Criar/Editar Pedido (`src/pages/Pedidos.tsx`)

### 1.1 Não copiar nome do pacote para Serviço
No `onValueChange` do Select de Pacote (linhas 384-394), remover a atribuição `servico: form.servico.trim() ? form.servico : v`. O campo Serviço passa a ser sempre digitado manualmente.

### 1.2 Campo Data e Hora — usabilidade
Substituir o único `<Input type="datetime-local">` por dois inputs lado a lado:

- **Data** (`type="date"`) com botão 📅 ao lado abrindo `Popover` + `Calendar` (shadcn) para escolha visual.
- **Hora** (`type="time"`) com botão 🕐 ao lado abrindo `Popover` com duas listas roláveis: horas (00–23) e minutos (00, 15, 30, 45).
- Auto-tab: ao completar 4 dígitos no ano (campo data), focar automaticamente no campo de hora (`useRef` + `onChange` checando `value.length === 10`).
- Internamente combinar `data + hora` no submit em ISO antes de salvar `data_entrega`.

Aplicar a mesma estrutura no modal de **Editar Pedido**.

## Parte 2 — Comprovante Público (`src/pages/ComprovantePublico.tsx`)

Buscar o pacote correspondente por nome para enriquecer a tela:

- Após carregar o pedido, se `pedido.pacote` existir, query: `supabase.from("pacotes").select("nome, preco, quantidade_fotos, icone").eq("nome", pedido.pacote).eq("user_id", pedido.user_id).maybeSingle()`.
- Adicionar bloco "Pacote adquirido" no card mostrando: nome (com ícone), valor formatado em R$ e "X fotos incluídas".

## Parte 3 — Schema (migration)

Adicionar colunas em `public.pagamentos`:

- `modo_pagamento text not null default 'entrada_saldo'` — valores `entrada_saldo` ou `total_antecipado`
- `percentual_entrada numeric not null default 50`
- `entrada_paga_em timestamptz`
- `saldo_pago_em timestamptz`
- `origem text not null default 'manual'` — `pix_auto` ou `manual`

Sem mudança em RLS (já existe `Users manage own payments`).

## Parte 4 — Seção "Pagamento" no detalhe do Pedido (`src/pages/Pedidos.tsx`)

### 4.1 Modal de detalhes
Hoje só existem modais Criar/Editar. Criar um **novo modal "Detalhes do Pedido"** acionado por um ícone 👁️ na coluna Ações (sem remover os existentes), exibindo dados do pedido e a nova seção Pagamento.

### 4.2 Lógica do Pagamento
Ao abrir o modal:

- Buscar `pagamentos` pelo `pedido_id`. Se não existir, **upsert** com `valor_total` = preço do pacote vinculado (ou 0), `status='pendente'`, `modo_pagamento='entrada_saldo'`, `percentual_entrada=50`, `origem='manual'`.

UI:
- Toggle "Pagamento total antecipado" → alterna `modo_pagamento`.
- Campo "Valor total (R$)" sempre editável (salvo via onBlur).
- **Modo `entrada_saldo`:**
  - Campo "Entrada (%)" editável (default 50).
  - Linhas calculadas: Entrada = total × %, Saldo = total − entrada.
  - **Etapa 1 — Entrada:** badge (🔴 Pendente / 🟢 Recebido). Botão "✅ Confirmar entrada de R$ X" → `AlertDialog` de confirmação → on confirm: `valor_pago = entrada`, `status = 'parcial'`, `entrada_paga_em = now()`, `origem = 'manual'`.
  - **Etapa 2 — Saldo:** só renderiza após `entrada_paga_em` setado. Badge + botão "✅ Confirmar saldo de R$ X" → confirma → `valor_pago = valor_total`, `status = 'pago'`, `saldo_pago_em = now()`.
- **Modo `total_antecipado`:**
  - Esconde etapas. Badge + botão "✅ Confirmar pagamento total de R$ X" → confirma → `valor_pago = valor_total`, `status = 'pago'`, `entrada_paga_em = saldo_pago_em = now()`, `origem='manual'`.

Como `pagamentos` já é a fonte do Financeiro (`receitaMes` filtra `status='pago'`), a integração com o módulo Financeiro é automática — nenhum código adicional.

## Parte 5 — Lista de Pedidos: badge de status de pagamento

Na tabela (`src/pages/Pedidos.tsx`):

- No `loadPedidos`, incluir `pagamentos(status, modo_pagamento)` no select.
- Adicionar coluna **"Pagamento"** entre Status e Cronômetro, mostrando:
  - 🔴 Não pago — `status='pendente'` ou sem pagamento
  - 🟡 Entrada recebida (50%) — `status='parcial'`
  - 🟢 Pago integral — `status='pago'`

## Parte 6 — Página Financeiro (`src/pages/Pagamentos.tsx`)

Pequeno ajuste apenas: no histórico de pagamentos (linha 471+), exibir badge da origem ao lado do StatusBadge:
- "PIX automático" se `origem='pix_auto'`
- "Confirmado manualmente" se `origem='manual'`

Os botões existentes "50% Inicial / 50% Final" continuam funcionando (passam a também setar `entrada_paga_em` / `saldo_pago_em` e `origem='manual'` para consistência).

## Detalhes técnicos

- Calendário: `Popover` + `Calendar` shadcn já disponíveis (`@/components/ui/calendar`, `@/components/ui/popover`), classe `pointer-events-auto`.
- Time picker custom: `Popover` com dois `ScrollArea` lado a lado renderizando botões para horas/minutos.
- Persistência das mudanças do pagamento usa `supabase.from("pagamentos").upsert(...)` com `onConflict: "pedido_id"` (ou select-then-insert/update se upsert exigir unique).
- Adicionar índice/constraint? Não — apenas garantir que cada pedido tenha no máximo 1 pagamento via lógica do app.
- Tipos do Supabase serão regenerados automaticamente após a migration.

## Arquivos afetados

- Migration nova (colunas em `pagamentos`)
- `src/pages/Pedidos.tsx` — ajustes no modal criar/editar, novo modal de detalhes, coluna Pagamento, novo TimePicker inline
- `src/pages/ComprovantePublico.tsx` — bloco do pacote
- `src/pages/Pagamentos.tsx` — badge de origem; etapas escrevem timestamps
