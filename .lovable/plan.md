

## Sistema de Camadas de Marca d'Água (Texto + Logo juntos)

Substituir o sistema atual "Imagem OU Texto" por um sistema de camadas onde múltiplos textos e logos coexistem na mesma foto.

### Database

Adicionar coluna `marca_dagua_camadas` (tipo `jsonb`, default `'[]'`) na tabela `profiles`. Manter colunas antigas para compatibilidade mas usar apenas a nova. Cada camada no JSON:

```json
[
  { "tipo": "texto", "texto": "PRÉVIA", "cor": "#FFFFFF", "tamanho": 24, "opacidade": 50, "posicao": "sup_esq" },
  { "tipo": "logo", "url": "https://...", "tamanho": 15, "opacidade": 30, "posicao": "centro" }
]
```

Migration: `ALTER TABLE profiles ADD COLUMN marca_dagua_camadas jsonb NOT NULL DEFAULT '[]'::jsonb;`

### Interface (ambos Configurações e GaleriaDetail)

Extrair componente compartilhado `src/components/WatermarkEditor.tsx`:

**Barra superior com 3 botões:**
- "Adicionar Texto" — adiciona camada tipo texto com defaults
- "Adicionar Logo" — adiciona camada tipo logo (abre upload)
- "Excluir todos" — limpa array de camadas

**Lista de camadas (abaixo dos botões):**
Cada camada é um card colapsável com:
- Texto: input de texto, color picker, slider tamanho fonte, slider opacidade, seletor posição (6 opções)
- Logo: preview da imagem + botão substituir/upload, slider tamanho %, slider opacidade, seletor posição

**Preview em tempo real (lado direito):**
Renderiza TODAS as camadas simultaneamente sobre a foto de exemplo (📸), cada uma na sua posição/opacidade/tamanho configurados.

### Alterações nos arquivos

1. **Migration** — adicionar `marca_dagua_camadas` ao profiles
2. **`src/components/WatermarkEditor.tsx`** (novo) — componente com toda a lógica de edição de camadas + preview
3. **`src/pages/Configuracoes.tsx`** — aba "Marca d'água" usa `<WatermarkEditor>`, carrega/salva `marca_dagua_camadas` do profile
4. **`src/pages/GaleriaDetail.tsx`** — seção de marca d'água usa `<WatermarkEditor>`, mesma lógica
5. **`src/pages/GaleriaPublica.tsx`** — atualizar renderização de marca d'água para ler camadas do profile (via join ou fetch separado) e renderizar múltiplas camadas

### Migração de dados existentes

No `loadProfile`, se `marca_dagua_camadas` estiver vazio mas existir `marca_dagua_tipo`/`marca_dagua_texto`/`marca_dagua_url`, converter automaticamente para o formato de camadas na primeira carga.

