## Plano — Data do pedido editável + ordenação estrita por horário

### Ajuste 1 — Campo "Data do pedido" no modal Editar Pedido (`src/pages/Pedidos.tsx`)

- Em `handleEdit` (abertura do modal), incluir `data_cadastro: format(new Date(p.created_at), "yyyy-MM-dd")` no `editForm`.
- Adicionar no modal Editar Pedido um `<Input type="date">` com label **"Data do pedido"** ligado a `editForm.data_cadastro`.
- Em `handleEditSave`, incluir no update do pedido:
  `created_at: new Date(`${editForm.data_cadastro}T12:00:00`).toISOString()` (somente se preenchido).

### Ajuste 2 — Ordenação estrita por horário

Hoje, em `Pedidos.tsx` e `Clientes.tsx`, quando dois itens têm o mesmo timestamp o código cai num fallback por UUID. O usuário quer ordenação puramente cronológica pelo `created_at` real (com horas/minutos/segundos).

- `src/pages/Pedidos.tsx` (linhas ~384-392): remover o fallback por UUID; manter apenas a comparação por `new Date(created_at).getTime()`.
- `src/pages/Clientes.tsx` (bloco `.sort` em `filtered`): mesma remoção, ordenar somente por `created_at`.

Como `created_at` já é armazenado com precisão de microssegundos no Postgres, dois cadastros no mesmo dia mas em horários diferentes serão corretamente ordenados (mais novo = horário mais recente).

### Arquivos afetados
- `src/pages/Pedidos.tsx`
- `src/pages/Clientes.tsx`
