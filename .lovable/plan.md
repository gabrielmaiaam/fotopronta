## Plano — Valor em Pedidos + Data de cadastro em Clientes

### 1. Adicionar coluna `valor` na tabela `pedidos`

Migration:
```sql
ALTER TABLE public.pedidos ADD COLUMN valor numeric;
```
(nullable, sem default — pedidos antigos ficam com `—`)

### 2. `src/pages/Pedidos.tsx`

A lógica de selecionar pacote/Outro/Sem pacote e o input "Valor do pedido (R$)" já existe nos dois modais. O que falta é **persistir** `valor` na tabela `pedidos`:

- **handleCreate**: incluir `valor: valorNum || null` no insert do pedido (hoje só vai pra `pagamentos`).
- **handleEditSave**: incluir `valor: valorNum || null` no update do pedido.
- **handleEdit**: ao abrir o modal, preencher `editForm.valor` a partir de `p.valor` (caindo para `pagamentos.valor_total` ou preço do pacote como fallback para pedidos antigos).
- **Tabela** (linha 382): já lê `p.valor` corretamente — funcionará assim que a coluna existir e for populada.
- Atualizar `src/integrations/supabase/types.ts` é automático após a migration.

Nenhuma mudança na UI dos modais — os campos já estão prontos.

### 3. `src/pages/Clientes.tsx` — campo "Data de cadastro"

- Adicionar `data_cadastro` ao state do form do modal Editar/Novo Cliente.
- Em `handleEdit` (abrir modal), preencher com `cliente.created_at` em formato `yyyy-MM-dd`.
- Adicionar `<Input type="date">` com label **"Data de cadastro"** no modal.
- Ao salvar (modo edição): incluir `created_at: new Date(form.data_cadastro).toISOString()` no update.
- Ao criar novo cliente: campo opcional; se preenchido, enviar `created_at`, senão deixar default.

### Arquivos afetados
- Migration nova (coluna `valor` em `pedidos`)
- `src/pages/Pedidos.tsx`
- `src/pages/Clientes.tsx`
