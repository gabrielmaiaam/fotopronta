

## Ajustes Solicitados

### 1. Modal "Nova Galeria" — Remover campos Tipo de Ensaio e Pacote
**Arquivo:** `src/pages/Galerias.tsx`
- Remover constantes `TIPOS_ENSAIO` e `PACOTES` (linhas 16-28)
- Remover `tipo_ensaio` e `pacote` do state `form` (linha 39)
- Remover `handlePacoteChange` (linha 106-108)
- Remover envio de `tipo_ensaio` e `pacote` no `handleCreate` (linhas 79-80)
- Remover os dois blocos de Select do modal (Tipo de ensaio: linhas 216-223, Pacote: linhas 225-233)
- Campos restantes no modal: Título, Cliente, Valor do pacote completo, Preço por foto avulsa

### 2. Modal "Criar Pedido" — Remover campos Tipo de Ensaio, Pacote e Express
**Arquivo:** `src/pages/Pedidos.tsx`
- Remover constantes `TIPOS_ENSAIO` e `PACOTES` (linhas 19-31)
- Remover `tipo_ensaio`, `pacote`, `express` do state `form` (linha 41)
- Remover envio de `tipo_ensaio`, `pacote`, `express` no `handleCreate` (linhas 76-77, 80)
- Remover o grid com os dois Selects (Tipo de ensaio + Pacote: linhas 280-294)
- Remover checkbox Express (linhas 304-306)
- Campos restantes no modal: Cliente, Serviço, Data e hora de entrega, Tempo estimado, Aviso do comprovante

### 3. Ícone de Galeria nos Clientes — Redirecionar para Galerias filtradas
**Arquivo:** `src/pages/Clientes.tsx`
- Importar `useNavigate` de react-router-dom
- No botão de galeria (linha 134), adicionar `onClick={() => navigate(`/galerias?cliente=${c.id}`)}`

**Arquivo:** `src/pages/Galerias.tsx`
- Importar `useSearchParams` de react-router-dom
- Ler parâmetro `cliente` da URL
- Adicionar state `clienteFilter` inicializado a partir do search param
- Ajustar o filtro `filtered` para também filtrar por `cliente_id` quando o parâmetro estiver presente
- Adicionar UI para mostrar/limpar o filtro de cliente ativo

