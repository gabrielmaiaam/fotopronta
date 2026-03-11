

## Redesign da Página Interna da Galeria (GaleriaDetail)

Reescrever `src/pages/GaleriaDetail.tsx` com layout completo inspirado na referência.

### Estrutura

**Cabeçalho** (linha compacta):
- Botão ← voltar à esquerda
- Título, cliente, badge de status, valor — inline
- Botões à direita: "Link" (copiar link público), "PIX" (copiar chave PIX do perfil), "Liberar Galeria" (se status === "previa")

**Corpo — 2 colunas** (`max-w-7xl`, grid `md:grid-cols-[35%_65%]`):

**Coluna esquerda — Marca d'água:**
- Card com título "Marca d'água" + aviso "A marca d'água é aplicada automaticamente"
- Carregar configs do perfil do usuário (marca_dagua_url, opacidade, tamanho, posicao)
- Upload de logo da marca d'água (reutilizar lógica de Configuracoes)
- Sliders de opacidade e tamanho
- Grid 3x2 de botões de posição (Sup. Esq, Sup. Dir, Centro, Inf. Esq, Inf. Dir, Repetir)
- Preview em miniatura com marca d'água aplicada (reutilizar lógica de preview de Configuracoes)

**Coluna direita — Fotos da galeria:**
- Card com título "Fotos da galeria" + aviso
- Área compacta de drag-and-drop para upload
- Subtítulo "Fotos e Vídeos (N)"
- Grid de miniaturas (`grid-cols-4 lg:grid-cols-5`) com botão delete no hover

**Rodapé** (abaixo das colunas, largura total):
- Card "Venda por foto avulsa" com campo de preço (Input) e botão "Salvar configurações"
- Texto auxiliar: "Deixe vazio para vender apenas o pacote completo"

### Dados
- Carregar profile do usuário para configs de marca d'água (chave_pix para botão PIX)
- Salvar marca d'água no profile ao alterar
- Salvar preco_avulso na galeria ao clicar em salvar

### Estilo
- Tema dark com detalhes dourados (já existente)
- Compacto para caber em 100% zoom sem scroll excessivo
- Responsivo: colunas empilham em mobile

