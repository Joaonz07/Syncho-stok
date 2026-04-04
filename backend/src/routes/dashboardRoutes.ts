import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', dashboardController.stats.bind(dashboardController));

export default router;
