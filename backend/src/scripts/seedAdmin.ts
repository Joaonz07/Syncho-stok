import 'dotenv/config';
import { ensureAdminUser } from '../services/seedAdmin';

ensureAdminUser()
  .then(() => {
    console.log('Admin seed finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Falha no seed do admin:', error);
    process.exit(1);
  });
