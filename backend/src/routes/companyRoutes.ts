import { Router } from 'express';
import { companyController } from '../controllers/companyController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// GET  /api/companies  (ADMIN only)
router.get('/', requireRole('ADMIN'), companyController.index.bind(companyController));

// GET  /api/companies/:id  (ADMIN only)
router.get('/:id', requireRole('ADMIN'), companyController.show.bind(companyController));

// POST /api/companies  (ADMIN only)
router.post('/', requireRole('ADMIN'), companyController.create.bind(companyController));

// PATCH /api/companies/:id/plan  (ADMIN only)
router.patch('/:id/plan', requireRole('ADMIN'), companyController.updatePlan.bind(companyController));

// GET  /api/companies/:id/users  (ADMIN only)
router.get('/:id/users', requireRole('ADMIN'), companyController.users.bind(companyController));

export default router;
