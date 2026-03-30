

## Ajuste no Modal "Criar Pedido"

**Arquivo:** `src/pages/Pedidos.tsx`

### Alterações:
1. **Remover campo "Tempo estimado (minutos)"** do formulário — remover o `<div>` com Label e Input de `tempo_estimado`
2. **Remover `tempo_estimado` do state `form`** — manter apenas `cliente_id`, `servico`, `data_entrega`
3. **Calcular `tempo_estimado_minutos` automaticamente no `handleCreate`** — usar `differenceInMinutes(new Date(form.data_entrega), new Date())` quando `data_entrega` estiver preenchido, senão usar 120 como fallback
4. **Atualizar o texto de aviso** para corresponder à imagem: "O tempo estimado será calculado automaticamente ao iniciar o pedido (da hora atual até a data de entrega)."
5. **Manter o aviso do comprovante** já existente

Layout final do modal conforme a imagem: Cliente → Serviço → Data e hora de entrega → Aviso de cálculo automático → Aviso do comprovante → Botão "Criar Pedido"

