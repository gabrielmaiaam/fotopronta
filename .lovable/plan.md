## Ajustes em Pedidos — Valor, Pagamento e Toggle Rápido

Implementação totalmente em `src/pages/Pedidos.tsx`, sem mudanças de schema (colunas `valor_total`, `status`, `valor_pago`, `origem` em `pagamentos` já existem).

### 1. Dropdown Pacote + Campo Valor (Criar e Editar)

- Adicionar `valor` ao state de `form` e `editForm`.
- No `SelectContent`, acrescentar `<SelectItem value="__outro__">✏️ Outro</SelectItem>` no final.
- No `onValueChange` do Select:
  - Se valor for um pacote da lista → setar `pacote = nome` e `valor = preco` do pacote (preenche automaticamente, mas o input continua editável).
  - Se "__outro__" → setar `pacote = "Outro"` e `valor = ""` (em branco).
  - Se "__none__" → `pacote = ""` e `valor = ""`.
- Adicionar `<Input>` com label **"Valor do pedido (R$)"** logo abaixo do Select de pacote, sempre editável.

### 2. Status de Pagamento no Modal Criar

- Adicionar `pagamento_status` ao `form` (default `"pendente"`).
- Novo grupo com dois botões/toggle (usar `RadioGroup` ou dois `Button` toggleáveis):
  - 🔴 Pendente (padrão)
  - 🟢 Pago
- No `handleCreate`:
  1. Insert do pedido como já é hoje (capturar `id` via `.select().single()`).
  2. Após criar, sempre inserir um row em `pagamentos`:
     - `valor_total = form.valor`, `cliente_id`, `pedido_id`, `user_id`, `modo_pagamento='total_antecipado'`, `percentual_entrada=100`.
     - Se `pagamento_status === "pago"`: `status='pago'`, `valor_pago = valor`, `entrada_paga_em = saldo_pago_em = now()`, `origem='manual'`.
     - Senão: `status='pendente'`, `valor_pago=0`.
- Como a página Financeiro (`src/pages/Pagamentos.tsx`) já soma `pagamentos.status='pago'` na receita e o Dashboard usa a mesma fonte, a venda aparece automaticamente.

### 3. Status de Pagamento no Modal Editar

- Ao abrir `handleEdit`, buscar pagamento atual do pedido (já vem em `p.pagamentos[0]`) e popular `editForm.pagamento_status` (`"pago"` se status é `pago`, senão `"pendente"`) e `editForm.valor` (do `pagamentos.valor_total` ou pacote).
- Mostrar o mesmo toggle Pendente/Pago.
- No `handleEditSave`, detectar mudança:
  - **Pendente → Pago**: abrir `AlertDialog` "Confirmar recebimento de R$ X,XX referente ao pedido de [Cliente]?". Ao confirmar: upsert em `pagamentos` com `status='pago'`, `valor_pago=valor`, `entrada_paga_em = saldo_pago_em = now()`, `origem='manual'`.
  - **Pago → Pendente**: `AlertDialog` "Deseja cancelar o recebimento deste pagamento? O valor será removido do Financeiro." Ao confirmar: update `status='pendente'`, `valor_pago=0`, `entrada_paga_em=null`, `saldo_pago_em=null`.
  - Sem mudança de status: só salvar os outros campos.
- Também atualizar `valor_total` do pagamento se o valor mudou.

### 4. Lista de Pedidos — Badge Clicável

- Simplificar a coluna **Pagamento** existente para mostrar apenas:
  - 🔴 Pendente (se status ≠ `pago`)
  - 🟢 Pago (se status = `pago`)
- Tornar o badge clicável (`<button>` wrap) → abre `AlertDialog` de confirmação rápida:
  - Se atualmente pendente: "Confirmar recebimento de R$ X,XX?" → marca como pago.
  - Se atualmente pago: "Cancelar este recebimento?" → marca como pendente.
- Após confirmar, faz update em `pagamentos` (mesma lógica do item 3) e recarrega.
- Garantir que o pedido tenha row em `pagamentos`; se não tiver (pedidos antigos), criar on-the-fly com `valor_total` = preço do pacote.

### 5. Ajustes técnicos

- Atualizar o `select` de `loadPedidos` para incluir `valor_total, valor_pago` em `pagamentos(...)` para usar nos modais e badge de toggle.
- Como a Etapa 2 (Entrada/Saldo) ainda é útil no modal de detalhes, **manter** o `PagamentoSection` existente sem alterações — a nova UI compacta de Criar/Editar coexiste com o controle detalhado.
- Sem migration nem mudança em outras páginas — Financeiro e Dashboard já consomem `pagamentos`.

### Arquivo afetado

- `src/pages/Pedidos.tsx` apenas.
