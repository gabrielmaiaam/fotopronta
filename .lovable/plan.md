## Por que o erro acontece

A tabela `clientes` tem uma chave estrangeira `user_id → auth.users(id)`, mas o app atual está sem login real (o `AuthContext` é um stub) e todas as inserções usam um UUID falso fixo (`00000000-0000-0000-0000-000000000000`). Como esse usuário não existe em `auth.users`, o banco rejeita o insert. O mesmo problema vai aparecer em Pedidos, Galerias, Pagamentos e Meta Ads.

A correção definitiva é ativar o login (que já estava previsto no projeto) e passar o ID do usuário real em todas as gravações.

## O que vamos fazer

### 1. Autenticação de verdade

- Criar página `/auth` com duas abas: **Entrar** e **Criar conta** (email + senha) e botão **Entrar com Google**.
- Reescrever `src/contexts/AuthContext.tsx` para usar Supabase Auth de verdade: registrar listener `onAuthStateChange` antes de `getSession()`, expor `user`, `session`, `loading` e `signOut`.
- Envolver as rotas privadas com `ProtectedRoute` (já existe o arquivo) — se não houver sessão, redireciona para `/auth`. A rota pública `/galeria/:link` continua aberta.
- Adicionar item “Sair” no `AppSidebar` mostrando o email do usuário logado.
- Login com Google usa o módulo gerenciado da Lovable Cloud (sem precisar de chaves).

### 2. Trocar o user_id fake pelo real

Em todas as páginas onde hoje aparece `user_id: "00000000-..."`, passar `user.id` da sessão:

- `src/pages/Clientes.tsx` (insert de cliente e de etiqueta)
- `src/pages/Pedidos.tsx`
- `src/pages/Galerias.tsx`
- `src/pages/Pagamentos.tsx`
- `src/pages/MetaAds.tsx`
- Qualquer outro lugar que faça insert/update com user_id.

### 3. Ajustar RLS nas tabelas que estão sem proteção

Hoje `despesas` e `meta_ads_investimentos` estão sem políticas RLS — isso faz com que mesmo logado o usuário não consiga ler/escrever quando o RLS estiver ativo. Vamos:

- Ativar RLS e criar política “Users manage own …” baseada em `auth.uid() = user_id` para `despesas` e `meta_ads_investimentos`.
- Trocar o default da coluna `user_id` dessas duas tabelas (hoje é o UUID fake) para `NULL`, e marcar como `NOT NULL` (sem default), forçando o app a sempre passar o ID correto.

### 4. Migrar os dados existentes para a sua conta

Para não perder o que já está cadastrado, vamos criar uma função SQL `claim_legacy_data()` (SECURITY DEFINER) que, ao ser chamada pelo usuário logado, atualiza todas as linhas com `user_id = '00000000-...'` para o `auth.uid()` atual nas tabelas: `clientes`, `pedidos`, `galerias`, `pagamentos`, `despesas`, `meta_ads_investimentos`, `etiquetas`, `profiles`.

No primeiro login bem-sucedido, o app chama essa função uma única vez (controlado por uma flag em `localStorage`) e mostra um toast “Dados migrados para sua conta”.

### 5. Confirmação de email

Por padrão o Supabase exige confirmação de email no signup. Para você não ficar travado testando, vamos **ativar auto-confirm** nas configurações de auth (signup já entra direto). Pode ser desligado depois nas configurações da Lovable Cloud.

## Detalhes técnicos

```text
src/
├── contexts/AuthContext.tsx        ← reescrito com Supabase Auth real
├── components/ProtectedRoute.tsx   ← passa a checar session de verdade
├── components/AppSidebar.tsx       ← mostra email + botão Sair
├── pages/
│   ├── Auth.tsx                    ← NOVO: login/cadastro/Google
│   ├── Clientes.tsx                ← user.id no insert
│   ├── Pedidos.tsx                 ← user.id no insert
│   ├── Galerias.tsx                ← user.id no insert
│   ├── Pagamentos.tsx              ← user.id no insert
│   └── MetaAds.tsx                 ← user.id no insert
└── App.tsx                         ← rota /auth pública + ProtectedRoute
```

Migração SQL (resumo):
- `ALTER TABLE despesas ENABLE ROW LEVEL SECURITY` + política `auth.uid() = user_id`.
- `ALTER TABLE meta_ads_investimentos ENABLE ROW LEVEL SECURITY` + política equivalente.
- Remover o default `'00000000-...'` nessas duas tabelas.
- Função `public.claim_legacy_data()` `SECURITY DEFINER` que faz `UPDATE ... SET user_id = auth.uid() WHERE user_id = '00000000-...'` em todas as tabelas listadas.

## Resultado esperado

- Você abre o app, é redirecionado para `/auth`, cria a conta (ou entra com Google).
- No primeiro login, todos os clientes/pedidos/galerias/pagamentos/despesas/Meta Ads antigos passam a ser seus.
- O cadastro de um novo cliente funciona normalmente (sem o erro de foreign key).
- Cada usuário só enxerga e edita os próprios dados.