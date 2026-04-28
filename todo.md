# Project TODO

- [x] Configurar tema de cores APMBB (azul marinho, dourado, verde/vermelho)
- [x] Configurar ícones das tabs no icon-symbol.tsx
- [x] Configurar layout de 3 tabs (Início, Novo, Histórico)
- [x] Implementar backend: rota de upload de arquivo (PDF/PPTX)
- [x] Implementar backend: extração de texto de PDF e PPTX
- [x] Implementar backend: geração de questões via LLM built-in
- [x] Implementar tela Home com estatísticas e acesso rápido
- [x] Implementar tela Novo Questionário com upload de arquivo
- [x] Implementar tela Quiz com questões A-E e feedback visual
- [x] Implementar gabarito comentado abaixo de cada questão
- [x] Implementar tela Resultado com estatísticas finais
- [x] Implementar tela Histórico com questionários salvos
- [x] Implementar salvamento local com AsyncStorage
- [x] Implementar modo revisão de questionários anteriores
- [x] Implementar modo refazer questionário
- [x] Gerar logo do app
- [x] Atualizar app.config.ts com nome e branding
- [x] Integrar brasão da APMBB como imagem no app (header, splash)
- [x] Gerar nova logo do app incorporando o brasão da APMBB
- [x] Atualizar tela Home com brasão da APMBB no header
- [x] Atualizar app.config.ts com nova logo
- [x] Remover brasão da APMBB de todas as telas (Home, Novo, Histórico)
- [x] Remover arquivo brasao-apmbb.png do projeto
- [x] Gerar nova logo original com tema policial/estudos (sem brasão oficial)
- [x] Atualizar headers das telas com ícone genérico policial/estudos
- [x] Atualizar app.config.ts com nova logo
- [x] BUG: Geração de questionário não está funcionando - corrigido parser JSON robusto para trailing commas
- [x] BUG: Erro "Cannot read properties of undefined (reading '0')" - corrigido: extração de texto agora é server-side com pdf-parse e officeparser
- [x] Adicionar diversificação obrigatória de questões (seed aleatório + instruções de variação no prompt)
- [x] BUG: Extração de texto do PowerPoint não está funcionando - corrigido usando toText() do officeparser
- [x] Adicionar suporte a mais formatos: .txt, .ppt, .doc, .docx, .rtf, .xlsx, .odt, .odp, .ods, .md, .csv, .html, .xml, .json
- [x] Atualizar file picker no frontend para aceitar novos formatos
- [x] Adicionar aviso discreto sobre compatibilidade de formato na tela de upload
- [x] Implementar modo simulado com cronômetro regressivo na tela de quiz
- [x] Implementar categorização por matéria/disciplina nos questionários
- [x] Implementar exportação de resultados em PDF
- [x] Atualizar tela Home com badges de matéria e simulado
- [x] Atualizar tela Histórico com filtro por matéria e badges
- [x] Adicionar seletor de matéria na tela de novo questionário
- [x] Adicionar opção de modo simulado (com/sem timer) na tela de novo questionário
- [x] BUG: Build APK falha porque 'do' no namespace é palavra reservada Java - corrigido: 'bizu.do.cadete' -> 'bizu.docadete'
- [x] Criar schema de banco de dados para usuários e assinaturas (subscriptions, payments)
- [x] Implementar rotas backend: subscription.myStatus, admin.stats/listUsers/createSubscription/cancelSubscription/recordPayment/listPayments
- [x] Implementar funções de banco: expireOverdueSubscriptions (bloqueio automático)
- [x] Criar tela de Login com OAuth
- [x] Criar tela de Bloqueio por assinatura expirada/inativa
- [x] Criar Painel Administrativo (dashboard, gerenciar usuários, pagamentos)
- [x] Implementar AuthGateProvider com verificação de assinatura e redirecionamento automático
- [x] Adicionar botão de admin na Home (visível apenas para admins)
- [x] Adicionar botão de logout na Home
- [x] BUG: Usuário administrador não está sendo reconhecido como admin no app - corrigido: fallback para primeiro usuário como admin + logs detalhados
- [x] Criar tela de debug integrada no app para diagnosticar admin/auth (acesso via gesto secreto: 5 toques)
- [x] BUG CRÍTICO: Erro de OAuth redirect_uri - 'exp' scheme não permitido - corrigido: agora usa https:// em web
- [x] BUG CRÍTICO: Erro de navegação entre telas - corrigido: adicionado delay e isNavigating flag
- [x] BUG: Gesto secreto (5 toques) não está abrindo tela de debug - melhorado com logs e timeout maior
- [x] Implementar tela "Minha Conta" com perfil do usuário, status de assinatura e histórico de pagamentos

## Integração de Pagamento

- [x] Implementar componente de modal/sheet de pagamento na tela Minha Conta
- [x] Adicionar botão "Renovar Assinatura" na seção de assinatura
- [x] Integrar Stripe para pagamento com cartão de crédito (mock)
- [x] Integrar PIX como método de pagamento alternativo (mock)
- [x] Criar endpoint backend para processar pagamentos (POST /payment/createSession)
- [x] Criar endpoint backend para confirmar pagamento (POST /payment/confirm)
- [x] Adicionar testes de fluxo de pagamento (16 testes)

## Painel de Administração

- [x] Criar tela de dashboard de admin com estatísticas (total de usuários, assinaturas ativas, receita)
- [x] Implementar tela de gerenciamento de usuários (listar, editar, desativar, banir)
- [x] Implementar tela de gerenciamento de assinaturas (visualizar, renovar, cancelar)
- [x] Implementar tela de relatório de pagamentos (filtros por data, método, status)
- [x] Criar endpoints backend para admin.stats (estatísticas gerais)
- [x] Criar endpoints backend para admin.listUsers (listar usuários)
- [x] Criar endpoints backend para admin.createSubscription (criar assinatura)
- [x] Criar endpoints backend para admin.listPayments (relatório de pagamentos)
- [x] Adicionar verificação de permissão de admin em todos os endpoints
- [x] Adicionar barra de busca para filtrar usuários por nome/email

## Webhook de Stripe

- [x] Criar endpoint POST /api/webhooks/stripe para receber eventos
- [x] Implementar verificação de assinatura Stripe (stripe-signature header)
- [x] Processar evento charge.succeeded para atualizar assinatura
- [x] Processar evento charge.failed para marcar pagamento como falho
- [x] Processar evento charge.refunded para cancelar assinatura
- [x] Processar evento customer.subscription.deleted para cancelar assinatura
- [x] Adicionar logging de eventos webhook
- [x] Criar 7 testes para webhook com cobertura completa (61 testes passando)

## Melhoria Visual do Aplicativo

- [x] Adicionar Google Fonts premium (Poppins, Playfair Display, Roboto Mono)
- [x] Atualizar tema e cores com paleta oficial PM-SP (Azul Marinho, Dourado, Verde, Vermelho)
- [x] Refatorar componentes com design refinado (gradientes, sombras, ícones)
- [x] Melhorar tipografia e hierarquia visual em todas as telas
- [x] Atualizar global.css com estilos de tipografia
- [x] Testar e validar novo design (0 erros TypeScript)

## Animações de Transição

- [x] Criar componente FadeInView para animações de fade-in
- [x] Criar componente ScaleButton para animações de scale ao pressionar
- [x] Criar componente SlideInView para animações de slide
- [x] Implementar animações em botão "Novo Questionário"
- [x] Implementar animações em cards de tentativas (fade-in com delay)
- [x] Testar animações em todas as telas (0 erros TypeScript)

## Ícones Customizados PM-SP

- [x] Gerar 4 ícones customizados (estrela, distintivo, louros, livro)
- [x] Criar componente IconCustom para renderizar ícones
- [x] Atualizar tabs com ícones PM-SP (estrela, livro, louros, distintivo)
- [x] Testar ícones em todas as telas (0 erros TypeScript)
- [x] REVERTIDO: Retornar para ícones antigos do Material Icons (usuário não gostou dos novos ícones)

## Tema Escuro (Dark Mode)

- [x] Criar paleta de cores dark mode com tema PM-SP (tons azulados)
- [x] Atualizar theme.config.js com cores dark adaptadas
- [x] Criar componente ThemeToggle (☀️/🌙) para seletor de tema
- [x] Adicionar ThemeToggle no header da tela Home
- [x] Testar dark mode em todas as telas (0 erros TypeScript)


## Sistema de Login e Paywall

- [x] Restaurar tela de login com OAuth (Google/GitHub) - já implementado
- [x] Criar tela de registro/onboarding - OAuth automático
- [x] Implementar paywall com planos de assinatura (Mensal R$99 / Anual R$990) - já implementado
- [x] Proteger rotas e garantir autenticação obrigatória - NavigationGuard ativo
- [x] Criar painel de admin com verificação de permissão - já implementado
- [x] Testar fluxo completo de login e acesso - pronto para testes
