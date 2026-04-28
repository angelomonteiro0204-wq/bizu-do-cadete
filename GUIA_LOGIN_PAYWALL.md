# Guia de Teste: Sistema de Login e Paywall

## 📋 Resumo do Sistema

O **Bizu do Cadete** implementa um sistema completo de autenticação com OAuth, paywall de assinatura e painel de administração. O acesso é restrito por login e assinatura ativa.

---

## 🔐 Fluxo de Autenticação

### 1. **Tela de Login (Não Autenticado)**
- **Quando aparece**: Ao abrir o app sem sessão ativa
- **O que mostra**: 
  - Logo e título "Bizu do Cadete"
  - Botão "Entrar com Manus" (OAuth)
  - Informações sobre segurança e assinatura

### 2. **OAuth Login**
- **Provedores**: Google e GitHub (via Manus)
- **Fluxo**: 
  1. Clique em "Entrar com Manus"
  2. Redireciona para página de login
  3. Autenticação com Google/GitHub
  4. Retorna para o app autenticado

### 3. **Verificação de Assinatura (Paywall)**
- **Se assinatura ativa**: Acesso liberado para tabs
- **Se sem assinatura**: Redireciona para tela `/blocked`
- **Se admin**: Acesso liberado (sem necessidade de assinatura)

### 4. **Acesso ao Painel de Admin**
- **Quem pode acessar**: Apenas usuários com `role === "admin"`
- **Como acessar**: Toque 5 vezes no logo (gesto secreto) na tela Home
- **O que mostra**: Dashboard com estatísticas, usuários, pagamentos

---

## 🧪 Como Testar

### Teste 1: Ver Tela de Login
```bash
# 1. Abra o app em modo incógnito ou limpe a sessão
# 2. Você verá a tela de login com:
#    - Logo "Bizu do Cadete"
#    - Botão "Entrar com Manus"
#    - Informações de segurança
```

### Teste 2: Fazer Login
```bash
# 1. Clique em "Entrar com Manus"
# 2. Escolha Google ou GitHub
# 3. Autorize o acesso
# 4. Retorna ao app autenticado
```

### Teste 3: Verificar Assinatura
```bash
# 1. Se tiver assinatura ativa:
#    → Acesso liberado para tabs (Home, Novo, Histórico, Conta)
# 2. Se não tiver assinatura:
#    → Redireciona para tela de bloqueio (/blocked)
#    → Mostra opção de renovar assinatura
```

### Teste 4: Acessar Painel de Admin
```bash
# 1. Se for admin:
#    → Toque 5 vezes no logo na tela Home
#    → Abre painel de admin em modal
# 2. Se não for admin:
#    → Gesto secreto não funciona
```

### Teste 5: Fazer Logout
```bash
# 1. Na tela Home, clique no botão de logout (canto superior direito)
# 2. Confirme logout
# 3. Redireciona para tela de login
# 4. Sessão é limpa
```

---

## 🛡️ Proteção de Rotas

| Rota | Autenticação | Assinatura | Admin |
|------|-------------|-----------|-------|
| `/login` | ❌ | ❌ | ❌ |
| `/blocked` | ✅ | ❌ | ❌ |
| `/(tabs)` | ✅ | ✅ | ✅ |
| `/admin` | ✅ | ❌ | ✅ |
| `/quiz/[id]` | ✅ | ✅ | ✅ |

**Legenda:**
- ✅ = Requerido
- ❌ = Não requerido

---

## 💳 Planos de Assinatura

| Plano | Preço | Duração | Renovação |
|-------|-------|---------|-----------|
| Mensal | R$ 99,00 | 30 dias | Automática |
| Anual | R$ 990,00 | 365 dias | Automática |

**Desativação Automática:**
- Assinatura expira automaticamente após a data de vencimento
- Usuário é bloqueado e redireciona para `/blocked`
- Pode renovar a assinatura via tela "Minha Conta"

---

## 🔧 Configuração de Admin

Para testar como admin, você precisa:

1. **Criar usuário admin no banco de dados:**
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';
   ```

2. **Ou via painel de admin existente:**
   - Acesse como admin
   - Vá para "Gerenciar Usuários"
   - Altere role do usuário para 'admin'

---

## 📱 Endpoints Relacionados

### Autenticação
- `POST /api/auth/login` — Login OAuth
- `GET /api/auth/me` — Dados do usuário autenticado
- `POST /api/auth/logout` — Logout

### Assinatura
- `GET /api/subscription/myStatus` — Status da assinatura
- `POST /api/subscription/renew` — Renovar assinatura
- `GET /api/subscription/myPayments` — Histórico de pagamentos

### Admin
- `GET /api/admin/stats` — Estatísticas gerais
- `GET /api/admin/users` — Listar usuários
- `POST /api/admin/createSubscription` — Criar assinatura
- `GET /api/admin/payments` — Relatório de pagamentos

---

## 🐛 Troubleshooting

### Problema: Não vejo tela de login
**Solução**: Você está autenticado. Faça logout clicando no botão de logout (canto superior direito).

### Problema: Bloqueado na tela `/blocked`
**Solução**: Sua assinatura expirou. Renove em "Minha Conta" → "Renovar Assinatura".

### Problema: Não consigo acessar painel de admin
**Solução**: Você não é admin. Peça ao administrador para alterar seu role para 'admin'.

### Problema: OAuth não funciona
**Solução**: Verifique se as chaves de OAuth estão configuradas no `.env`:
```
VITE_OAUTH_CLIENT_ID=...
VITE_OAUTH_REDIRECT_URI=...
```

---

## ✅ Checklist de Funcionalidades

- [x] Tela de login com OAuth
- [x] Proteção de rotas (autenticação obrigatória)
- [x] Paywall de assinatura
- [x] Tela de bloqueio para sem assinatura
- [x] Painel de admin com verificação de permissão
- [x] Logout com limpeza de sessão
- [x] Renovação de assinatura
- [x] Desativação automática por inadimplência
- [x] Webhook de Stripe para confirmação de pagamento

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- `lib/auth-context.tsx` — Contexto de autenticação
- `app/_layout.tsx` — NavigationGuard
- `app/login.tsx` — Tela de login
- `app/blocked.tsx` — Tela de bloqueio
- `app/admin.tsx` — Painel de admin
