# Syncho CRM

Projeto com frontend React + Vite e backend Express + TypeScript, preparados para deploy separado no Vercel.

## Estrutura

- backend: API, autenticação, Socket.io e integrações com Supabase.
- frontend: SPA React com build via Vite.

## Variáveis de ambiente

Backend: copie backend/.env.example para backend/.env e preencha:

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
FRONTEND_URL=https://seu-frontend.vercel.app
SERVE_STATIC_FRONTEND=false
```

Frontend: copie frontend/.env.example para frontend/.env e preencha:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-public-key
VITE_API_URL=https://seu-backend.vercel.app
```

## Desenvolvimento local

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Build de produção

Backend:

```bash
cd backend
npm install
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run preview
```

## Deploy no Vercel - Arquitetura Separada

Este projeto usa **dois projetos independentes** no Vercel:

### 1️⃣ Backend Project

**Root Directory:** `backend`

Arquivo pronto no repo:
- `backend/vercel.json`
- `backend/api/index.ts`

Variáveis de Ambiente (preencha no Vercel):
```
NODE_ENV=production
SUPABASE_URL=https://tdjldzfrhwaxnbmpcaup.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1Ni...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
FRONTEND_URL=https://syncho-frontend.vercel.app
SERVE_STATIC_FRONTEND=false
```

### 2️⃣ Frontend Project

**Root Directory:** `frontend`

Arquivo pronto no repo:
- `frontend/vercel.json`

Variáveis de Ambiente (preencha no Vercel):
```
VITE_SUPABASE_URL=https://tdjldzfrhwaxnbmpcaup.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://syncho-backend.vercel.app
```

### 3️⃣ Ajustar CORS do backend

No projeto backend do Vercel, ajuste `FRONTEND_URL` com a URL real do frontend publicado.

### ✅ Validação Final

1. Backend: `https://<backend>.vercel.app/health` deve retornar `{ status: "OK" }`
2. Frontend: abrir `https://<frontend>.vercel.app`
3. Login, dashboard e CRUD devem funcionar com API em `/api/*` do backend

### Observação importante sobre Socket.IO no Vercel

- O Vercel Serverless atende HTTP, mas não mantém servidor Socket.IO persistente da mesma forma que um Node dedicado.
- Fluxos de tempo real por WebSocket (chat/presença) podem ter limitação no Vercel.
- Se o tempo real for crítico, mantenha o socket em um serviço dedicado e use o backend Vercel para REST.

## Integração em produção

- O frontend usa VITE_API_URL para todas as requisições HTTP.
- O backend restringe CORS usando FRONTEND_URL.
- Para Vercel, manter `SERVE_STATIC_FRONTEND=false` no backend.

## Checklist pós-deploy

1. Abrir o frontend público e validar login.
2. Confirmar /health no backend.
3. Testar dashboard, funil, produtos e criação de dados.
4. Validar chat/socket em produção.
