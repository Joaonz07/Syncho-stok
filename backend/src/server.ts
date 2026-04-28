import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { getPort } from './config/runtime';
import { ensureAdminUser } from './services/seedAdmin';
import { initSocketGateway } from './socket/gateway';

const httpServer = createServer(app);
initSocketGateway(httpServer);

const startServer = async () => {
  const PORT = getPort();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Nao bloqueia o boot do servidor por tarefas de seed.
  void ensureAdminUser()
    .then(() => {
      console.log('Admin seed checked successfully.');
    })
    .catch((error) => {
      console.error('Admin seed failed (continuing server):', error);
    });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
