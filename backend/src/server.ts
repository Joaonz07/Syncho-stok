import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { ensureAdminUser } from './services/seedAdmin';
import { initSocketGateway } from './socket/gateway';

const httpServer = createServer(app);
initSocketGateway(httpServer);

const startServer = async () => {
  await ensureAdminUser();
  const PORT = process.env.PORT || 5000;

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
