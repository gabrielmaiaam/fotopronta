## Plano: Módulo de Indicações

Novo módulo de programa de indicações com link público de captura de leads, integrado ao sistema existente.

### 1. Banco de dados (migração)

**Tabela `indicacoes`** (links gerados):
- `id` uuid PK
- `user_id` uuid (RLS)
- `cliente_id` uuid (cliente que indica)
- `codigo` text único (gerado automático, ~6 chars)
- `recompensa_tipo` text ('percentual' | 'valor_fixo')
- `recompensa_valor` numeric
- `status` text ('aguardando' | 'convertido') default 'aguardando'
- `created_at` timestamptz

**Tabela `indicacao_leads`** (leads capturados via link público):
- `id` uuid PK
- `user_id` uuid
- `indicacao_id` uuid → indicacoes
- `nome` text
- `whatsapp` text nullable
- `created_at` timestamptz

**Colunas em `profiles`** (configurações do programa):
- `indicacao_ativo` boolean default true
- `indicacao_modo` text default 'desconto' ('desconto' | 'comissao')
- `indicacao_tipo` text default 'percentual' ('percentual' | 'valor_fixo')
- `indicacao_valor` numeric default 10

**RLS:**
- `indicacoes`: SELECT/INSERT/UPDATE/DELETE para `auth.uid() = user_id`; **SELECT público por código** (anon) — necessário para a página pública resolver o link.
- `indicacao_leads`: ALL para owner; **INSERT público (anon)** quando existe `indicacoes` correspondente — para captura sem login.

Atualizar `claim_legacy_data()` para migrar as duas novas tabelas.

### 2. Frontend — área autenticada

**`src/pages/Indicacoes.tsx`** (nova página):
- 4 cards de resumo: Links gerados, Leads capturados, Conversões, Taxa de conversão (%).
- Botão "+ Gerar Link" (canto sup. direito).
- Lista "TODOS OS LINKS (X)" com busca por nome/código.
- Cada item: cliente + badge status, data, link completo (`<origin>/indicacao/CODIGO`), badge recompensa, lead capturado ou "Nenhum lead ainda", ações (copiar/abrir/editar/excluir).
- Estado vazio com ícone de presente.
- **Modal "Gerar Link"**: dropdown clientes + recompensa atual exibida + botão azul full-width. Gera código único (random 6 chars, retry se colisão).
- **Modal "Editar Indicação"**: tipo (% ou R$) + valor + salvar.
- **Seção "Configurações do Programa"**: toggle ativo, modo, tipo, valor, salvar (atualiza `profiles`).
- Marcar como "Convertido" via ação no item (botão extra) — atende o requisito de marcação manual.

**Sidebar (`src/components/AppSidebar.tsx`)**: adicionar item "Indicações" (ícone `Gift`) entre "Prévia Rápida" e "Financeiro".

**Rota (`src/App.tsx`)**: `/indicacoes` (protegida) + `/indicacao/:codigo` (pública, fora do `ProtectedRoute`).

### 3. Página pública

**`src/pages/IndicacaoPublica.tsx`**:
- Layout mobile-first, tema dark azul existente.
- Logo "Foto Pronta", ícone 🎁, título "Você foi indicado!", texto adaptado para "ensaio digital" / "Foto Pronta".
- Badge dourado com a recompensa real do link (busca por código via supabase anon).
- Form: nome (obrigatório, validado com zod), WhatsApp (opcional), botão "Quero solicitar meu ensaio!".
- Submit: insere em `indicacao_leads` com `user_id` e `indicacao_id` derivados do registro do código. Mostra confirmação.
- Tratamento de código inválido / programa inativo.

### 4. Lógica de métricas

- Links gerados = count(indicacoes)
- Leads capturados = count(indicacao_leads)
- Conversões = count(indicacoes where status='convertido')
- Taxa = Conversões / Leads × 100 (0 se leads=0)

### 5. Validação e segurança

- Zod schemas para inputs (nome ≤100, whatsapp ≤20, valor numérico).
- RLS estrita; política pública apenas para SELECT por código e INSERT de lead vinculado a indicação válida.
- `user_id` sempre derivado da indicação no insert público (não enviado pelo cliente).

### Arquivos

Criar: `src/pages/Indicacoes.tsx`, `src/pages/IndicacaoPublica.tsx`, migração SQL.
Editar: `src/App.tsx`, `src/components/AppSidebar.tsx`, `mem://index.md` + nova memória `mem://features/indicacoes.md`.
