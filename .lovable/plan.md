# Simplificar comprovante removendo card de pacote

No desktop o comprovante mostra um card "Pacote adquirido" com nome do pacote, valor e fotos incluídas — e logo abaixo aparece de novo "Valor" (linha sempre visível). Fica redundante e poluído.

## Mudança

**Arquivo:** `src/pages/ComprovantePublico.tsx`

- Remover completamente o bloco do card `Pacote adquirido` (o `<div>` com `rounded-xl border border-primary/30 bg-primary/5`).
- Remover a busca do pacote no `useEffect` e o estado `pacote` (não são mais usados).
- Simplificar a linha de "Pacote": sempre mostrar `pedido.pacote` quando existir (sem o `&& !pacote`).

Resultado: layout enxuto com Cliente, Serviço, Pacote (texto), Valor, Status, Criado em, Prazo — igual no mobile e no desktop.

## Arquivos afetados
- `src/pages/ComprovantePublico.tsx`
