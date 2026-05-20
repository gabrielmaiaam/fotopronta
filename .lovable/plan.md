# Ajustes na página Pedidos

## Ajuste 1 — Coluna "Valor" em uma única linha

Atualmente a célula da coluna Valor quebra "R$" em uma linha e o preço na linha seguinte quando o espaço aperta.

**Arquivo:** `src/pages/Pedidos.tsx`

- Linha 377 (`<TableHead>Valor</TableHead>`): adicionar `className="whitespace-nowrap"`.
- Linha 397 (célula do valor): adicionar `className="whitespace-nowrap"` para garantir que "R$ 14,90" permaneça sempre na mesma linha.
- Opcionalmente trocar o espaço normal entre `R$` e o número por `\u00A0` (non-breaking space) como reforço.

Não mexer na largura das outras colunas — o `whitespace-nowrap` já força o layout da tabela a dar prioridade de espaço para Valor.

## Ajuste 2 — Ícones de calendário e relógio em branco

Os ícones nativos dos inputs `type="date"` e `type="time"` aparecem pretos sobre fundo escuro (péssimo contraste). Isso ocorre em todos os formulários que usam `<DateTimePicker>` ou `<Input type="date">` (Pedidos, Galerias, Configurações, Relatórios, etc.).

**Arquivo:** `src/index.css`

Adicionar regra global no bloco `@layer base`:

```css
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator,
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: invert(1) brightness(2);
  cursor: pointer;
  opacity: 0.9;
}
```

Isso inverte o ícone preto padrão do Chromium para branco em todos os inputs de data/hora do app, sem precisar alterar componente por componente.

## Arquivos afetados
- `src/pages/Pedidos.tsx`
- `src/index.css`
