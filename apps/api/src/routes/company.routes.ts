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
router.get('/:company_id', getCompanyByIdHandler);
router.post('/', createCompanyHandler);
router.patch('/:company_id', updateCompanyHandler);
router.delete('/:company_id', deleteCompanyHandler);
router.post('/:company_id/users', createCompanyUserHandler);

export default router;


