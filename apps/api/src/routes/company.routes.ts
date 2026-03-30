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
import {
  COMPANY_CREATE_DELETE_ROLES,
  COMPANY_MODULE_ROLES,
} from '../utils/role-capabilities.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(...COMPANY_MODULE_ROLES), listCompaniesHandler);
router.get('/:company_id', authorize(...COMPANY_MODULE_ROLES), getCompanyByIdHandler);
router.post('/', authorize(...COMPANY_CREATE_DELETE_ROLES), createCompanyHandler);
router.patch('/:company_id', authorize(...COMPANY_MODULE_ROLES), updateCompanyHandler);
router.delete('/:company_id', authorize(...COMPANY_CREATE_DELETE_ROLES), deleteCompanyHandler);
router.post('/:company_id/users', authorize(...COMPANY_MODULE_ROLES), createCompanyUserHandler);

export default router;


