import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  createProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
  listProductsHandler,
  updateProductHandler,
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  listProductsHandler,
);
router.get(
  '/:product_id',
  authorize(UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  getProductByIdHandler,
);

router.post(
  '/',
  authorize(UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  createProductHandler,
);
router.patch(
  '/:product_id',
  authorize(UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  updateProductHandler,
);
router.delete(
  '/:product_id',
  authorize(UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  deleteProductHandler,
);

export default router;


