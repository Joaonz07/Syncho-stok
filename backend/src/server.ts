import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { setupSocket } from './socket/socketHandler';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const httpServer = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocket(io);

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io listening on http://localhost:${PORT}`);
});

export default httpServer;
