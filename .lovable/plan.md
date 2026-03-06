

## Foto Pronta — Sistema de Gestão de Ensaios Fotográficos com IA

### Fase 1: Identidade Visual e Layout Base
- Configurar tema dark customizado (fundo #0a0a0a/#111111, destaque dourado #c9a84c/#d4a843)
- Criar layout com sidebar fixa à esquerda (#141414) com logo "📸 Foto Pronta", navegação (Dashboard, Clientes, Galerias, Pedidos, Pagamentos, Configurações) e rodapé com usuário logado + logout
- Sidebar colapsável em mobile com botão hambúrguer

### Fase 2: Autenticação
- Tela de login (email + senha) e cadastro (nome, email, senha) com estilo dark/dourado
- Autenticação via Lovable Cloud (Supabase Auth)
- Redirecionamento pós-login para Dashboard
- Rotas protegidas

### Fase 3: Banco de Dados
- Tabela **profiles** (nome, plano, chave_pix, nome_recebedor, cidade, marca_dagua configs)
- Tabela **clientes** (usuario_id, nome, whatsapp, email)
- Tabela **galerias** (usuario_id, cliente_id, titulo, tipo_ensaio, pacote, valor_total, preco_avulso, status, link_publico)
- Tabela **fotos** (galeria_id, url, url_com_marca_dagua, aprovada)
- Tabela **pedidos** (usuario_id, cliente_id, servico, tipo_ensaio, pacote, data_entrega, tempo_estimado, status, express, link_comprovante)
- Tabela **pagamentos** (pedido_id, cliente_id, valor_total, valor_pago, status)
- RLS policies para que cada usuário acesse apenas seus dados
- Storage bucket para fotos e marca d'água

### Fase 4: Dashboard
- Gráfico de receita com filtros (Hoje, 7 dias, 30 dias, Este mês) usando Recharts
- 4 cards de resumo: Galerias, Receita Total, Pendentes, Clientes
- Tabela de galerias recentes (últimas 5)
- Estado vazio com mensagem motivacional

### Fase 5: Clientes (CRUD)
- Listagem com busca por nome
- Tabela: Nome, WhatsApp, Galerias, Data cadastro, Ações (ver/editar/excluir)
- Modal de criação/edição com validação (nome obrigatório, máscara WhatsApp)

### Fase 6: Galerias (CRUD)
- Listagem com busca + filtro por status
- Tabela com link copiável, badges de status coloridos
- Modal de criação: título, cliente (dropdown), tipo de ensaio, pacote (com preenchimento automático de valor), preço avulso opcional
- Página interna da galeria: info, upload drag-and-drop, grid de fotos com miniatura, botão liberar galeria
- Marca d'água aplicada nas fotos visualizadas antes do pagamento

### Fase 7: Pedidos (CRUD)
- 4 cards resumo (Hoje, Em andamento, Próxima entrega, Tempo médio)
- Visualização Lista (tabela com progresso, cronômetro, badges) e Calendário (mensal com eventos coloridos)
- Modal criar pedido: cliente, serviço, tipo ensaio, pacote, data/hora entrega, tempo estimado, checkbox Express (+R$15)
- Geração automática de link de comprovante

### Fase 8: Pagamentos
- 4 cards resumo (Receita mês, Total recebido, Pendente, Conversão %)
- Filtro por status (Todos/Pago/Pendente/Parcial)
- Lista com controle de pagamento em 2 etapas (50% + 50%)
- Badges: Pago (verde), Pendente (vermelho), Parcial (amarelo)

### Fase 9: Configurações
- **Aba Perfil**: nome, email (read-only), plano (read-only)
- **Aba PIX & QR Code**: chave PIX com detecção automática de tipo, nome recebedor, cidade. Preview do QR Code gerado + botão download
- **Aba Marca d'água**: upload de imagem, sliders opacidade/tamanho, seletor de posição (6 opções). Preview em tempo real

### Fase 10: Galeria Pública
- Página pública acessível por link único sem login
- Exibe fotos com marca d'água antes do pagamento
- Após pagamento confirmado, fotos sem marca d'água
- Opção de seleção avulsa (se preço avulso configurado)

### Fase 11: Dados de Exemplo (Seed)
- 1 usuário demo (Gabriel Abreu)
- 2 clientes, 2 galerias, 2 pedidos, pagamentos de exemplo

### Responsividade
- Layout adaptativo em todas as páginas
- Sidebar colapsável em mobile
- Tabelas com scroll horizontal em telas pequenas

