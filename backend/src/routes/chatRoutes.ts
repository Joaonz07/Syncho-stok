import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/chat  – fetch message history for the user's company
router.get('/', chatController.index.bind(chatController));

export default router;
