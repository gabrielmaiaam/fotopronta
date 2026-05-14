## Diagnóstico

As políticas RLS dos buckets `fotos` e `marca-dagua` exigem que o **primeiro segmento de pasta do arquivo seja `auth.uid()`**:

```
((bucket_id = 'fotos') AND ((auth.uid())::text = (storage.foldername(name))[1]))
((bucket_id = 'marca-dagua') AND ((auth.uid())::text = (storage.foldername(name))[1]))
```

Mas em três lugares estamos enviando arquivos com prefixo fixo `"uploads/..."`, o que viola a RLS e o upload é silenciosamente bloqueado:

1. **`src/pages/GaleriaDetail.tsx`** linha 89 → `uploads/${id}/...` (upload de fotos da galeria)
2. **`src/pages/GaleriaDetail.tsx`** linha 219 → `<WatermarkEditor userId="uploads" />` (logo da marca d'água dentro da galeria)
3. **`src/pages/Configuracoes.tsx`** linha 364 → `<WatermarkEditor userId="uploads" />` (logo na aba Marca d'água das Configurações)

O bucket `fotos` é público e as policies de INSERT/SELECT estão corretas — basta corrigir o caminho.

## Correções

### 1. Upload de fotos da galeria (GaleriaDetail)

- Obter `auth.uid()` no `loadData()` e guardar em estado.
- Trocar o `filePath` para `${userId}/${galeriaId}/${uuid}.${ext}`.
- Manter o `File` original sem qualquer compressão/transformação (já é o caso) e passar `contentType: file.type, cacheControl: '3600', upsert: false` para garantir entrega na resolução original.
- Tratar erros corretamente (atualmente o toast de sucesso aparece mesmo quando todos falham — separar contagem de sucessos/falhas).
- Recarregar grid após upload (já faz).

### 2. Logo da marca d'água dentro da galeria

- Passar o `auth.uid()` real para `<WatermarkEditor userId={userId} />` em vez de `"uploads"`.
- Já carrega automaticamente as camadas salvas no `profiles.marca_dagua_camadas` via `migrateLegacyWatermark` (linha 81), então uma logo enviada uma vez aparece em todas as galerias.
- O botão "Salvar marca d'água" já persiste no `profiles` — manter.

### 3. Logo na aba Marca d'água das Configurações

- Passar o `auth.uid()` real para `<WatermarkEditor userId={userId} />` em vez de `"uploads"`.
- O `saveMarcaDagua` já grava `marca_dagua_camadas` no profile (a mesma fonte que o GaleriaDetail lê), então a logo aparece automaticamente em cada galeria nova.

## Arquivos a editar

- `src/pages/GaleriaDetail.tsx` — adicionar carregamento do `userId`, corrigir `filePath` do `handleUpload`, passar `userId` real ao `WatermarkEditor`.
- `src/pages/Configuracoes.tsx` — adicionar carregamento do `userId` e passar ao `WatermarkEditor`.

## Banco / Storage

Nenhuma migração necessária. Buckets e policies já estão corretos:
- `fotos` (público) → INSERT/SELECT/DELETE por usuário OK
- `marca-dagua` (público) → INSERT/SELECT/UPDATE/DELETE por usuário OK

## Resolução original das fotos

O Supabase Storage **não comprime nem redimensiona** arquivos no upload — o que entra é o que sai. O `<input type="file">` também não toca o arquivo. Vamos apenas garantir `contentType: file.type` no `upload()` para servir com o mime correto e não há nenhum `<canvas>` ou redimensionamento no caminho.
