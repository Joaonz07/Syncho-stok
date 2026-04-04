import { Router } from 'express';
import { productController } from '../controllers/productController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET    /api/products
router.get('/', productController.index.bind(productController));

// GET    /api/products/:id
router.get('/:id', productController.show.bind(productController));

// POST   /api/products
router.post('/', productController.create.bind(productController));

// PUT    /api/products/:id
router.put('/:id', productController.update.bind(productController));

// DELETE /api/products/:id
router.delete('/:id', productController.destroy.bind(productController));

// GET    /api/products/:id/movements
router.get('/:id/movements', productController.movements.bind(productController));

export default router;
