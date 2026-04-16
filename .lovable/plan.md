

## Remover Login e Desabilitar RLS

### Database Migration
Desabilitar RLS em todas as tabelas:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE galerias DISABLE ROW LEVEL SECURITY;
ALTER TABLE fotos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas DISABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_etiquetas DISABLE ROW LEVEL SECURITY;
```

### Código

1. **`src/App.tsx`** — Remover `AuthProvider`, `ProtectedRoute`, rota `/auth`. Todas as rotas ficam diretas dentro de `AppLayout`.

2. **`src/contexts/AuthContext.tsx`** — Simplificar: remover lógica de Supabase auth. Manter o contexto mas com `user: null`, `signOut` vazio (para não quebrar imports existentes).

3. **`src/components/ProtectedRoute.tsx`** — Simplificar para apenas renderizar `children` sem verificação.

4. **`src/components/AppSidebar.tsx`** — Remover botão "Sair" e referência a `useAuth`/`signOut`. Remover fetch de nome do profile.

5. **Todas as páginas que usam `useAuth()` ou `auth.uid()`** — Remover dependência de `user.id` nos inserts. Usar um ID fixo placeholder ou remover o campo `user_id` das queries (já que RLS está desabilitado, as queries funcionam sem filtro por user).

6. **`src/pages/Auth.tsx`** — Pode ser removido ou redirecionar para `/dashboard`.

### Impacto importante
Sem RLS, qualquer pessoa que acesse o app verá TODOS os dados de TODOS os usuários. Sem `user_id` nos filtros, os dados não serão isolados. Isso é adequado apenas para uso pessoal/desenvolvimento.

