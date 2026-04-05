# Syncho CRM

Projeto com frontend React + Vite e backend Express + TypeScript, preparados para deploy separado no Railway.

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
FRONTEND_URL=https://seu-frontend.up.railway.app
SERVE_STATIC_FRONTEND=false
```

Frontend: copie frontend/.env.example para frontend/.env e preencha:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-public-key
VITE_API_URL=https://seu-backend.up.railway.app
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

## Deploy no Railway

Backend service:

- Root Directory: backend
- Build Command: npm install && npm run build
- Start Command: npm start
- Healthcheck Path: /health
- Environment Variables: PORT, SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL

Frontend service:

- Root Directory: frontend
- Build Command: npm install && npm run build
- Start Command: npm run preview
- Environment Variables: VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_API_URL, PORT

## Integração em produção

- O frontend usa VITE_API_URL para todas as requisições HTTP.
- O Socket.io também conecta usando VITE_API_URL.
- O backend restringe CORS usando FRONTEND_URL.
- Se quiser servir o frontend pelo backend no mesmo processo, defina SERVE_STATIC_FRONTEND=true e disponibilize um index.html compilado em backend/public.

## Checklist pós-deploy

1. Abrir o frontend público e validar login.
2. Confirmar /health no backend.
3. Testar dashboard, funil, produtos e criação de dados.
4. Validar chat/socket em produção.
