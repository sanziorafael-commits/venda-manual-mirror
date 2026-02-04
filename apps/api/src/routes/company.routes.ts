import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  createCompanyUserHandler,
  createCompanyHandler,
  deleteCompanyHandler,
  getCompanyByIdHandler,
  listCompaniesHandler,
  updateCompanyHandler,
} from '../controllers/company.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.get('/', listCompaniesHandler);
router.get('/:companyId', getCompanyByIdHandler);
router.post('/', createCompanyHandler);
router.patch('/:companyId', updateCompanyHandler);
router.delete('/:companyId', deleteCompanyHandler);
router.post('/:companyId/users', createCompanyUserHandler);

export default router;
