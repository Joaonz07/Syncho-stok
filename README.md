# 📈 Syncho-Stock

Um SaaS completo de gestão de estoque com arquitetura monolítica (frontend + backend no mesmo repositório).

## 🚀 Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + TailwindCSS + Vite |
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | Supabase (PostgreSQL + Auth + Realtime) |
| ORM | Prisma |
| Chat em tempo real | Socket.io |
| Tipagem compartilhada | `/shared/types` |

## 📁 Estrutura do Projeto

```
syncho-stock/
├── backend/                   # API Express + TypeScript
│   ├── prisma/
│   │   └── schema.prisma      # Modelos do banco de dados
│   ├── src/
│   │   ├── config/            # Supabase & Prisma clients
│   │   ├── controllers/       # Camada de controle (MVC)
│   │   ├── middleware/        # Auth JWT + RBAC
│   │   ├── routes/            # Rotas REST organizadas
│   │   ├── services/          # Regras de negócio
│   │   ├── socket/            # Handler do Socket.io
│   │   ├── app.ts             # Configuração do Express
│   │   └── server.ts          # Entry point HTTP + Socket.io
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                  # React + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── contexts/          # React Context (Auth)
│   │   ├── hooks/             # Custom hooks (useProducts, useSales, useChat…)
│   │   ├── pages/             # Páginas da aplicação
│   │   └── services/          # Camada de API (Axios)
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
└── shared/
    └── types/
        └── index.ts           # Tipos TypeScript compartilhados (frontend ↔ backend)
```

## ✨ Funcionalidades

- **Autenticação** – Login/cadastro via Supabase Auth com JWT
- **Multi-tenant** – Cada empresa tem seus dados isolados
- **Gestão de estoque** – CRUD de produtos com movimentações automáticas
- **Registro de vendas** – Baixa automática no estoque dentro de transação
- **Dashboard** – Estatísticas, gráficos, alertas de estoque baixo
- **Chat em tempo real** – Socket.io com histórico persistido
- **Painel Admin** – Gerenciar empresas, usuários e planos (BASIC / PRO / PREMIUM)
- **RBAC** – Middleware `requireRole` para controle de acesso por perfil

## 🗄️ Modelos do Banco

```
Company → User (1:N)
Company → Product (1:N)
Company → Sale (1:N)
Company → Message (1:N)
Sale → SaleItem (1:N) → Product
Product → StockMovement (1:N)
User → Sale (1:N)
User → Message (1:N)
```

## 🔌 API Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/register` | ❌ | Cadastro |
| GET | `/api/auth/me` | ✅ | Perfil atual |
| GET | `/api/products` | ✅ | Listar produtos |
| POST | `/api/products` | ✅ | Criar produto |
| PUT | `/api/products/:id` | ✅ | Atualizar produto |
| DELETE | `/api/products/:id` | ✅ | Excluir produto |
| GET | `/api/products/:id/movements` | ✅ | Movimentações |
| GET | `/api/sales` | ✅ | Listar vendas |
| POST | `/api/sales` | ✅ | Registrar venda |
| GET | `/api/dashboard/stats` | ✅ | Estatísticas |
| GET | `/api/chat` | ✅ | Histórico do chat |
| GET | `/api/companies` | ✅ ADMIN | Listar empresas |
| POST | `/api/companies` | ✅ ADMIN | Criar empresa |
| PATCH | `/api/companies/:id/plan` | ✅ ADMIN | Alterar plano |

## ⚙️ Como Rodar

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 1. Configure as variáveis de ambiente

```bash
# Backend
cp backend/.env.example backend/.env
# Preencha: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env
# Preencha: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
# API rodando em http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App rodando em http://localhost:5173
```

## 🔐 Autenticação

O sistema utiliza **Supabase Auth** para gerenciar credenciais e emite um **JWT próprio** com o payload:

```json
{
  "sub": "user-uuid",
  "email": "user@email.com",
  "role": "ADMIN | CLIENT",
  "companyId": "company-uuid"
}
```

## 💬 Socket.io

O cliente se conecta enviando o token JWT:

```js
const socket = io('http://localhost:3001', {
  auth: { token: 'Bearer ...' }
});

// Enviar mensagem
socket.emit('chat:send', 'Olá!');

// Receber mensagens
socket.on('chat:message', (message) => console.log(message));
```

## 📦 Planos de Assinatura

| Plano | Descrição |
|-------|-----------|
| BASIC | Plano inicial |
| PRO | Recursos avançados |
| PREMIUM | Acesso completo |

Apenas usuários com role `ADMIN` podem alterar o plano de uma empresa.
