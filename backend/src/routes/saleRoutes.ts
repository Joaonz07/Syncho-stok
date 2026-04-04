import { Router } from 'express';
import { saleController } from '../controllers/saleController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET  /api/sales
router.get('/', saleController.index.bind(saleController));

// GET  /api/sales/:id
router.get('/:id', saleController.show.bind(saleController));

// POST /api/sales
router.post('/', saleController.create.bind(saleController));

export default router;
