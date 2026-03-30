import { Router } from 'express';

import {
  createProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
  listProductsHandler,
  updateProductHandler,
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { PRODUCT_MUTATION_ROLES, PRODUCT_READ_ROLES } from '../utils/role-capabilities.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(...PRODUCT_READ_ROLES),
  listProductsHandler,
);
router.get(
  '/:product_id',
  authorize(...PRODUCT_READ_ROLES),
  getProductByIdHandler,
);

router.post('/', authorize(...PRODUCT_MUTATION_ROLES), createProductHandler);
router.patch('/:product_id', authorize(...PRODUCT_MUTATION_ROLES), updateProductHandler);
router.delete('/:product_id', authorize(...PRODUCT_MUTATION_ROLES), deleteProductHandler);

export default router;


