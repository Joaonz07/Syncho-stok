import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', authController.login.bind(authController));

// POST /api/auth/register
router.post('/register', authController.register.bind(authController));

// GET /api/auth/me  (protected)
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
