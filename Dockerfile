FROM node:20-alpine

WORKDIR /app

# ── Frontend ──────────────────────────────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Backend ───────────────────────────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend/ ./backend/

# Copiar build do frontend para pasta public do backend
RUN cp -r frontend/dist/. backend/public/

# Compilar TypeScript do backend
RUN cd backend && npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "dist/server.js"]
