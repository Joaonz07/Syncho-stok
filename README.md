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

## Deploy no Railway - Arquitetura Separada

Este projeto usa **dois serviços independentes** no Railway:

### 1️⃣ Backend Service (noble-warmth)

**URL gerada:** `https://noble-warmth-production-bde7.up.railway.app`

Configuração Railway:
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Healthcheck Path:** `/health`

Variáveis de Ambiente (preencha no Railway):
```
PORT=                              # Railway auto-atribui
NODE_ENV=production
SUPABASE_URL=https://tdjldzfrhwaxnbmpcaup.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1Ni...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
FRONTEND_URL=https://syncho-frontend.up.railway.app     # (será criado no passo 2)
SERVE_STATIC_FRONTEND=false
```

### 2️⃣ Frontend Service (criar novo)

**Passo-a-passo para criar:**

1. Acesse **https://railway.app** → Dashboard
2. Clique em **+ New** → **GitHub Repo** → Selecione `Syncho-stok`
3. Configure o novo serviço:
   - **Service Name:** `syncho-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview`

4. Após criar, vá em **Variables** e adicione:
   ```
   PORT=4173
   VITE_SUPABASE_URL=https://tdjldzfrhwaxnbmpcaup.supabase.co
   VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_API_URL=https://noble-warmth-production-bde7.up.railway.app
   ```

5. Deploy vai iniciar automaticamente. Aguarde até ficar **ACTIVE** (verde).

6. **Copie a URL gerada** do frontend (ex: `syncho-frontend.up.railway.app`)

### 3️⃣ Atualizar Backend com URL do Frontend

Após o frontend estar ACTIVE:

1. Volte ao serviço **noble-warmth** no Railway
2. Vá em **Variables**
3. Atualize: `FRONTEND_URL=https://syncho-frontend.up.railway.app`
4. Salve → Backend vai fazer redeploy automaticamente

### ✅ Validação Final

Acesse `https://syncho-frontend.up.railway.app` no navegador:
- ✅ Deve mostrar página de login
- ✅ Após login, deve conectar ao backend
- ✅ Dados devem persistir no Supabase
- ✅ Sockets devem funcionar (verifique chat/notificações)

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
