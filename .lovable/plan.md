## Causa raiz

A ordenação da tabela já está correta — usa `created_at` decrescente. O problema é nos **dados salvos**:

```
Danny             → 2026-05-19 20:57:07 UTC (17:57 BRT) ← criado normalmente
Andréia Dos Santos → 2026-05-19 15:00:00 UTC (12:00 BRT) ← forçado por bug
```

No modal Criar/Editar Pedido, o campo "Data do pedido" é `type="date"` (só data, sem hora) e ao salvar o código força `T12:00:00`:

```ts
created_at: new Date(`${form.data_cadastro}T12:00:00`).toISOString()
```

Resultado: qualquer pedido cuja data foi editada no modal perde a hora real e fica fixado às 12:00 BRT — aparecendo abaixo de pedidos com horário real posterior no mesmo dia, mesmo tendo sido cadastrado depois.

## Correção

Em `src/pages/Pedidos.tsx`:

1. **Linha 129** (handleCreate): trocar `new Date(\`${form.data_cadastro}T12:00:00\`)` por `new Date(form.data_cadastro)`.
2. **Linha 167** (handleEdit): carregar `data_cadastro` com hora — `format(new Date(p.created_at), "yyyy-MM-dd'T'HH:mm")`.
3. **Linha 185** (persistEdit): mesmo ajuste do item 1 para `editForm.data_cadastro`.
4. **Linhas 545-553** (modal Criar): substituir `<Input type="date">` por `<DateTimePicker>` (mesmo componente já usado em "Data e hora de entrega"). Label: "Data e hora do pedido".
5. **Linhas 627-635** (modal Editar): mesma substituição.

Não mexer no estado inicial `data_cadastro: ""` — se vazio, o backend mantém o `now()` padrão (já correto para novos pedidos).

Não alterar a ordenação (já está por `created_at` desc) nem a coluna "Criado em" (continua exibindo só `dd/MM/yy`).

## Sobre o registro da Andréia

Após o fix, basta abrir o pedido em "Editar", ajustar a hora correta e salvar — o `created_at` será atualizado com data + hora reais e a ordenação refletirá isso.

## Arquivos afetados
- `src/pages/Pedidos.tsx`