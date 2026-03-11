

## Plano de Ajustes

### 1. QR Code PIX no padrão EMV/BR Code

**Problema:** O QR Code atual codifica apenas a chave PIX bruta, que não é reconhecido pelos apps bancários. O padrão PIX exige um payload EMV (BR Code) com campos TLV específicos.

**Solução:** Criar uma função utilitária `generatePixPayload` em `src/lib/pix.ts` que monta o payload estático seguindo a spec EMV do Banco Central:
- Payload Format Indicator (ID 00)
- Merchant Account Information (ID 26) com GUI `br.gov.bcb.pix` e chave PIX
- Merchant Category Code (ID 52): `0000`
- Transaction Currency (ID 53): `986` (BRL)
- Country Code (ID 58): `BR`
- Merchant Name (ID 59): nome do recebedor
- Merchant City (ID 60): cidade
- CRC16 (ID 63): checksum CRC-CCITT

Não precisa de biblioteca externa -- o payload EMV é simples de montar manualmente com funções TLV + CRC16.

**Alteração em `Configuracoes.tsx`:**
- Importar `generatePixPayload` e gerar o payload a partir de `chavePix`, `nomeRecebedor`, `cidade`
- Passar o payload (não a chave bruta) para a URL do QR Code API

### 2. Marca d'água por texto

**DB:** Adicionar colunas à tabela `profiles` via migration:
- `marca_dagua_tipo` (text, default `'imagem'`) — `'imagem'` ou `'texto'`
- `marca_dagua_texto` (text, nullable) — o texto a exibir
- `marca_dagua_texto_cor` (text, default `'#FFFFFF'`) — cor do texto
- `marca_dagua_texto_tamanho` (integer, default `24`) — tamanho da fonte em px

**Alteração em `Configuracoes.tsx` (aba Marca d'água):**
- Adicionar state para `marcaTipo`, `marcaTexto`, `marcaTextoCor`, `marcaTextoTamanho`
- Dois botões de modo no topo: "Imagem" / "Texto"
- Modo Imagem: mantém UI atual (upload, sliders, posição)
- Modo Texto: campo de texto, color picker (`<input type="color">`), slider de tamanho da fonte, slider de opacidade (reutiliza o existente), botões de posição (reutiliza)
- Preview: quando modo texto, renderiza `<span>` com as configurações no lugar da `<img>`
- Salvar inclui os novos campos

**Alteração em `GaleriaDetail.tsx`:** Atualizar a seção de marca d'água para suportar o modo texto também (mesma lógica de preview).

