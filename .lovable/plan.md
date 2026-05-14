## 1. Botão "Finalizar pedido" na tabela de Pedidos

Em `src/pages/Pedidos.tsx`, na coluna **Ações**:

- Adicionar botão com ícone `CheckCircle2` (lucide-react), exibido **somente quando `p.status === "em_andamento"`**.
- Ao clicar, abrir um `AlertDialog` de confirmação com o texto:
  > "Deseja marcar este pedido como finalizado?"
  
  Botões: **Cancelar** e **Finalizar** (destacado).
- Ao confirmar: `update pedidos set status = 'finalizado' where id = ...`, recarregar lista e exibir toast.
- Reordenar os ícones para: **✅ Finalizar | ✏️ Editar | 🗑️ Excluir | 🔗 Link** (mantendo o botão ▶️ Iniciar antes para status `aguardando`, já que ele faz parte do fluxo).

Comportamento já garantido pelo código existente:
- `getCronometro` retorna `"—"` quando `status !== "em_andamento"` → cronômetro para sozinho.
- `StatusBadge` já renderiza verde para `finalizado`.
- O próprio condicional `status === "em_andamento"` faz o botão sumir após finalizar.

## 2. Corrigir 404 dos links públicos

**Diagnóstico:**
- `/galeria/:link` e `/indicacao/:codigo` **já estão corretamente registrados** em `src/App.tsx` fora do `ProtectedRoute`. O Lovable hosting faz SPA fallback automaticamente, então esses links **funcionam** — o 404 reportado nesses casos provavelmente vem de links antigos/com código inválido. Vou validar mantendo as rotas como estão.
- **`/comprovante/:link` NÃO existe como rota.** O botão "Copiar link" em Pedidos copia `${origin}/comprovante/${link}`, mas não há `<Route path="/comprovante/:link">` em `App.tsx` nem página correspondente. Esse é o 404 real.

**Correção:**

1. Criar `src/pages/ComprovantePublico.tsx` — página pública (sem login) que:
   - Lê `:link` da URL e busca em `pedidos` por `link_comprovante`.
   - Mostra dados do pedido: cliente, serviço, valor, status atual com badge, data de criação, prazo de entrega, progresso e cronômetro (mesma lógica visual do dashboard interno, em layout mobile-first com tema escuro e branding "Foto Pronta").
   - Se não encontrar, exibe mensagem "Comprovante não encontrado".

2. Em `src/App.tsx`, adicionar a rota **fora do `ProtectedRoute`**, junto às outras públicas:
   ```tsx
   <Route path="/comprovante/:link" element={<ComprovantePublico />} />
   ```

3. Confirmar que `galeria` e `indicacao` permanecem fora do `ProtectedRoute` (já estão).

Não é necessário criar `_redirects`, `vercel.json` ou alterar `vite.config.ts` — o Lovable hosting já trata o SPA fallback no nível da infraestrutura.

## Arquivos afetados

- `src/pages/Pedidos.tsx` (editar)
- `src/pages/ComprovantePublico.tsx` (novo)
- `src/App.tsx` (adicionar rota)
