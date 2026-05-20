## Plano — Horário de cadastro de clientes + ajustes no modal de Pedido

### Ajuste 1 — Clientes: editar/registrar horário do cadastro

Arquivo: `src/pages/Clientes.tsx`

- Trocar o campo `data_cadastro` (tipo `date`) por um campo `datetime-local` no modal, usando o componente `DateTimePicker` (`src/components/DateTimePicker.tsx`) que já existe no projeto e oferece data + hora.
- No `openNew`: inicializar com `format(new Date(), "yyyy-MM-dd'T'HH:mm")`.
- No `openEdit`: inicializar com `format(new Date(c.created_at), "yyyy-MM-dd'T'HH:mm")`.
- No `handleSave`: gravar `created_at: new Date(form.data_cadastro).toISOString()` (preservando hora/minuto digitados, sem forçar `T12:00:00`).
- Label do campo: continuar **"Data de cadastro"** (sem alterar o texto).
- **Não alterar a coluna "Cadastro" da tabela** — continua mostrando apenas `dd/MM/yyyy` (sem horário visível).

### Ajuste 2 — Modal Criar/Editar Pedido: reordenar e remover botões duplicados

Arquivo: `src/pages/Pedidos.tsx`

- Mover o campo **"Data do pedido"** (`data_cadastro`) para **acima** do campo **"Data e hora de entrega"** (`data_entrega`) nos modais Criar Pedido e Editar Pedido.
- Remover os botões pequenos de ícone (📅 calendário e 🕐 relógio) que aparecem ao lado dos inputs no `DateTimePicker`, mantendo apenas os inputs nativos `date`/`time` que já têm os ícones nativos do navegador.

Para isso, editar `src/components/DateTimePicker.tsx`:
- Remover os blocos `<Popover>` com `<CalendarIcon />` e `<Clock />` (e respectivos `PopoverTrigger`/`PopoverContent`).
- Manter apenas os `<Input type="date">` e `<Input type="time">` lado a lado.
- Como esse componente é usado em outros lugares, a remoção dos botões se aplica globalmente (consistente com o pedido do usuário de eliminar duplicação).

### Arquivos afetados
- `src/pages/Clientes.tsx`
- `src/pages/Pedidos.tsx`
- `src/components/DateTimePicker.tsx`

Sem mudanças de schema — `created_at` já é `timestamp with time zone`.
