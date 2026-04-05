import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { getPort } from './config/runtime';
import { ensureAdminUser } from './services/seedAdmin';
import { initSocketGateway } from './socket/gateway';

const httpServer = createServer(app);
initSocketGateway(httpServer);

const startServer = async () => {
  await ensureAdminUser();
  const PORT = getPort();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
