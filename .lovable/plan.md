## Backup & Exportação em Excel

### Objetivo
Adicionar nova aba "Backup & Exportação" em Configurações com botões para exportar dados do sistema em arquivos `.xlsx` gerados no navegador via SheetJS.

### Dependência
- Adicionar `xlsx` (SheetJS) ao `package.json`.

### Mudanças em `src/pages/Configuracoes.tsx`
1. Adicionar nova `<TabsTrigger value="backup">Backup & Exportação</TabsTrigger>` e respectivo `<TabsContent>`.
2. Criar componente/seção interna com 4 botões:
   - **⬇️ Exportar tudo em Excel** (principal, destaque)
   - **⬇️ Exportar só Clientes**
   - **⬇️ Exportar só Pedidos**
   - **⬇️ Exportar só Financeiro**
3. Cada botão tem estado de loading individual (ícone `Loader2` girando + texto "Gerando..."). Ao concluir: `toast.success("Backup gerado com sucesso!")`. Em erro: `toast.error(...)`.

### Lógica de exportação
- Função utilitária local `exportToXlsx(sheets: { name: string; rows: any[] }[], filename: string)` que:
  - Cria `XLSX.utils.book_new()`.
  - Para cada aba: `XLSX.utils.json_to_sheet(rows)` → `XLSX.utils.book_append_sheet`.
  - `XLSX.writeFile(wb, filename)` (dispara download no navegador).
- Nome do arquivo: `FotoPronta_Backup_DD-MM-AAAA.xlsx` (e variantes `_Clientes`, `_Pedidos`, `_Financeiro`).

### Queries Supabase e mapeamento de colunas
Todas as consultas usam o `supabase` client já existente (sem RLS — retorna tudo).

**Aba "Clientes"** — `clientes` + contagem de galerias:
```
nome, whatsapp, email, galerias (count), created_at → "Data de cadastro" (dd/MM/yyyy)
```
Buscar `clientes` e fazer `select('*, galerias(count)')` ou contar via segunda query agrupada.

**Aba "Galerias"** — `galerias` + join cliente:
```
titulo, cliente (clientes.nome), status, valor_total, created_at
```

**Aba "Pedidos"** — `pedidos` + join cliente:
```
cliente (clientes.nome), servico, data_entrega, status, origem_cliente, created_at
```

**Aba "Financeiro"** — `pagamentos` + join cliente:
```
cliente (clientes.nome), valor_total, valor_pago, status, created_at
```

**Aba "Despesas"** — `despesas`:
```
nome, valor, categoria (Tipo), created_at formatado como "MM/yyyy"
```

### Formatação
- Datas formatadas com `date-fns` (`format(new Date(x), 'dd/MM/yyyy')`) — já presente no projeto.
- Valores numéricos mantidos como `number` para Excel reconhecer.
- Cabeçalhos em português (definidos pelas chaves do objeto passado a `json_to_sheet`).

### Arquivos
- `package.json` — adicionar `xlsx`.
- `src/pages/Configuracoes.tsx` — nova aba + handlers de exportação.

Sem alteração de schema, sem migration.
