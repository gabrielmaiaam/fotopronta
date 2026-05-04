# Pacotes & Preços — Nova aba em Configurações

## 1. Banco de dados (migration)

Criar tabela `pacotes` vinculada ao usuário:

```sql
CREATE TABLE public.pacotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  icone text DEFAULT '📦',
  quantidade_fotos integer NOT NULL DEFAULT 1,
  preco numeric NOT NULL DEFAULT 0,
  beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pacotes" ON public.pacotes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Atualizar `claim_legacy_data` para incluir `pacotes`.

Os 4 pacotes padrão (Básico, Essencial, Clássico, Premium) **não** são inseridos via migration (multi-tenant). Em vez disso, a página `Configuracoes` faz seed automático na primeira visita do usuário, quando `select` retornar lista vazia.

## 2. Nova aba em `src/pages/Configuracoes.tsx`

Adicionar `<TabsTrigger value="pacotes">Pacotes & Preços</TabsTrigger>` e respectivo `<TabsContent>`. Conteúdo:

- Header com botão "+ Novo Pacote" (cria pacote em branco no estado local).
- Grid responsivo (`md:grid-cols-2`) de cards, um por pacote, contendo:
  - Linha topo: input de ícone (largura ~60px, emoji) + input de nome.
  - Inputs numéricos: Quantidade de fotos, Preço (R$).
  - Linha calculada (read-only): "Valor unitário: R$ X,XX" — recalculado em tempo real via `useMemo` (`preco / quantidade`, mostra "—" se quantidade ≤ 0).
  - Bloco "Benefícios": lista de inputs com botão de remover por linha (ícone X) + botão "+ Adicionar benefício". Pode ficar vazio.
  - Footer do card: botão `Salvar alterações` (per-pacote, faz upsert) + botão `Excluir` (vermelho, abre `AlertDialog` de confirmação).
- Estado: `pacotes: PacoteForm[]` carregado de `supabase.from('pacotes').select().order('ordem')`. Edições mantidas em memória até o salvamento.

## 3. Integração nos modais

### Galerias (`src/pages/Galerias.tsx`)
- Carregar pacotes do usuário no mount.
- Adicionar `<Select>` "Pacote" acima do campo "Valor do pacote completo".
- Ao selecionar um pacote: preencher automaticamente `valor_total` (preco), e armazenar `pacote` (nome) na coluna existente `galerias.pacote`. Usuário ainda pode editar manualmente o valor.
- Opção "Personalizado" mantém comportamento atual.

### Pedidos (`src/pages/Pedidos.tsx`)
- Adicionar `<Select>` "Pacote" no modal de criação (e no modal de edição).
- Ao selecionar: preencher `pacote` (coluna existente em `pedidos.pacote`) e usar nome no campo `servico` se ainda vazio.
- Não há coluna de valor em pedidos hoje, então só o vínculo de pacote é gravado.

## 4. Seed dos 4 pacotes padrão

Na primeira carga de `Configuracoes` na aba Pacotes, se `pacotes` estiver vazio para o usuário:

```ts
const defaults = [
  { icone:'🔹', nome:'Pacote Básico',     quantidade_fotos:1,  preco:14.90, beneficios:['1 cenário e 1 look à sua escolha'] },
  { icone:'✨', nome:'Pacote Essencial',  quantidade_fotos:3,  preco:34.90, beneficios:['1 cenário e 1 look à sua escolha','1 ajuste gratuito após entrega'] },
  { icone:'⭐', nome:'Pacote Clássico',   quantidade_fotos:5,  preco:49.90, beneficios:['1 cenário e 1 look à sua escolha','1 ajuste gratuito após entrega'] },
  { icone:'💎', nome:'Pacote Premium',    quantidade_fotos:10, preco:89.90, beneficios:['Até 2 cenários e 2 looks à sua escolha','1 ajuste gratuito após entrega'] },
];
```

Inserir todos com `user_id = auth.uid()` e `ordem` 0..3, depois recarregar.

## 5. Memória do projeto

Adicionar `mem://features/pacotes` resumindo o modelo (tabela `pacotes`, seed automático, integração com Galerias/Pedidos) e referenciá-lo em `mem://index.md`.

## Arquivos afetados

- `supabase/migrations/<timestamp>_pacotes.sql` (novo)
- `src/pages/Configuracoes.tsx` (nova aba)
- `src/pages/Galerias.tsx` (select de pacote no modal)
- `src/pages/Pedidos.tsx` (select de pacote nos modais)
- `mem://features/pacotes.md` + atualização do `mem://index.md`
