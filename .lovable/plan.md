

## Sistema de Etiquetas Coloridas para Clientes

### Database (2 novas tabelas)

**Tabela `etiquetas`:** `id` (uuid PK), `user_id` (uuid, not null), `nome` (text), `cor` (text), `created_at`. RLS: users manage own.

**Tabela `cliente_etiquetas`:** `id` (uuid PK), `cliente_id` (uuid, not null), `etiqueta_id` (uuid, not null), unique(cliente_id, etiqueta_id). RLS: users manage own (via join to etiquetas.user_id).

### UI Changes — `src/pages/Clientes.tsx`

1. **Header:** Add "Etiquetas" button (with Tag icon) next to "Novo Cliente"
2. **Painel "Gerenciar Etiquetas"** (collapsible Card below header, toggled by button):
   - Input "Nova etiqueta..." + 10+ color circles (selectable) + "+ Criar" button
   - List of existing tags with delete (X) button each
3. **Table:** Add "Etiquetas" column between Nome and WhatsApp, rendering colored Badge components
4. **Edit modal:** Add multi-select section for etiquetas (clickable badges to toggle on/off)
5. **Data loading:** Query `etiquetas` and `cliente_etiquetas` alongside clientes; on save, sync junction table

### Colors palette
`#5B7FFF`, `#8B5CF6`, `#F97316`, `#22C55E`, `#EF4444`, `#EC4899`, `#06B6D4`, `#EAB308`, `#84CC16`, `#9CA3AF`

