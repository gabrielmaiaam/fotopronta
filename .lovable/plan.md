# Mostrar Valor no Comprovante em qualquer situação

No comprovante público, o preço só aparece dentro do card "Pacote adquirido" — e esse card só renderiza quando o pacote do pedido bate exatamente com algum cadastrado em `pacotes`. Nos casos "Outro" ou "Pacote Essencial" não localizado, o valor some.

## Mudança

**Arquivo:** `src/pages/ComprovantePublico.tsx` — adicionar uma linha "Valor" sempre visível (usando `pedido.valor`), logo após o bloco do pacote e antes de Status:

```tsx
{pedido.valor != null && (
  <div className="flex justify-between items-center">
    <span className="text-muted-foreground text-sm">Valor</span>
    <span className="font-semibold text-primary">
      R$ {Number(pedido.valor).toFixed(2).replace(".", ",")}
    </span>
  </div>
)}
```

Mostra o valor em todos os cenários (com ou sem card de pacote), garantindo que o cliente veja o preço sempre.

## Arquivos afetados
- `src/pages/ComprovantePublico.tsx`
