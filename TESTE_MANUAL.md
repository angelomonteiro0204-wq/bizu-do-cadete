# Teste Manual Completo - Bizu do Cadete

## 1. Autenticação e Login
- [ ] Acessar aplicativo sem autenticação
- [ ] Ser redirecionado para tela de login
- [ ] Fazer login com OAuth (Google/GitHub)
- [ ] Verificar se usuário é criado no banco de dados
- [ ] Verificar se sessão é mantida após login

## 2. Tela de Minha Conta
- [ ] Visualizar perfil do usuário (nome, email)
- [ ] Ver status da assinatura (ativa/expirada/sem assinatura)
- [ ] Ver data de vencimento da assinatura
- [ ] Ver histórico de pagamentos
- [ ] Botão de logout funciona corretamente

## 3. Integração de Pagamento
- [ ] Clicar em "Renovar Assinatura" abre modal de pagamento
- [ ] Modal exibe opções: Cartão de Crédito e PIX
- [ ] Selecionar "Cartão de Crédito" mostra informações Stripe
- [ ] Selecionar "PIX" mostra QR code e chave PIX
- [ ] Após pagamento simulado, assinatura é atualizada

## 4. Aba de ADMIN - Dashboard
- [ ] Acessar aba de ADMIN (deve estar disponível para admin)
- [ ] Dashboard exibe 4 cards com estatísticas:
  - Total de Usuários
  - Assinaturas Ativas
  - Receita Total
  - Pagamentos Pendentes
- [ ] Estatísticas são atualizadas corretamente
- [ ] Pull-to-refresh funciona

## 5. Aba de ADMIN - Gerenciamento de Usuários
- [ ] Listar todos os usuários cadastrados
- [ ] Cada usuário exibe: nome, email, status (ativo/inativo)
- [ ] Barra de busca funciona para filtrar por nome/email
- [ ] Botão "Renovar" cria nova assinatura
- [ ] Botão "Pagamento" abre modal para registrar pagamento
- [ ] Botão "Bloquear" cancela assinatura ativa
- [ ] Ações refletem imediatamente na lista

## 6. Aba de ADMIN - Relatório de Pagamentos
- [ ] Listar todos os pagamentos registrados
- [ ] Cada pagamento exibe: valor, data, método, status
- [ ] Pagamentos são ordenados por data (mais recentes primeiro)
- [ ] Valores são formatados corretamente em reais

## 7. Funcionalidades Gerais
- [ ] Tema claro/escuro funciona
- [ ] Navegação entre abas é suave
- [ ] Sem erros de console
- [ ] Aplicativo é responsivo em diferentes tamanhos

## 8. Webhook de Stripe (Backend)
- [ ] Endpoint /api/webhooks/stripe está acessível
- [ ] Webhook processa charge.succeeded
- [ ] Webhook processa charge.failed
- [ ] Webhook processa charge.refunded
- [ ] Assinaturas são atualizadas automaticamente

---

## Notas de Teste
- Data do teste: [PREENCHER]
- Navegador: [PREENCHER]
- Dispositivo: [PREENCHER]
- Problemas encontrados: [PREENCHER]
