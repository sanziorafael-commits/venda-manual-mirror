import type { Request, Response } from 'express';
import { z } from 'zod';

import {
  companyQuerySchema,
  createCompanyUserSchema,
  createCompanySchema,
  updateCompanySchema,
} from '../schemas/company.schema.js';
import {
  createCompany,
  deleteCompany,
  getCompanyById,
  listCompanies,
  updateCompany,
} from '../services/company.service.js';
import { createUserForCompany } from '../services/user.service.js';
import { unauthorized } from '../utils/app-error.js';

const companyParamSchema = z.object({
  companyId: z.string().cuid(),
});

export async function listCompaniesHandler(req: Request, res: Response) {
  const query = companyQuerySchema.parse(req.query);
  const result = await listCompanies(query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getCompanyByIdHandler(req: Request, res: Response) {
  const { companyId } = companyParamSchema.parse(req.params);
  const data = await getCompanyById(companyId);
  res.status(200).json({ data });
}

export async function createCompanyHandler(req: Request, res: Response) {
  const payload = createCompanySchema.parse(req.body);
  const data = await createCompany(payload);
  res.status(201).json({ data });
}

export async function updateCompanyHandler(req: Request, res: Response) {
  const { companyId } = companyParamSchema.parse(req.params);
  const payload = updateCompanySchema.parse(req.body);
  const data = await updateCompany(companyId, payload);
  res.status(200).json({ data });
}

export async function deleteCompanyHandler(req: Request, res: Response) {
  const { companyId } = companyParamSchema.parse(req.params);
  await deleteCompany(companyId);
  res.status(200).json({ data: { ok: true } });
}

export async function createCompanyUserHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const { companyId } = companyParamSchema.parse(req.params);
  const payload = createCompanyUserSchema.parse(req.body);
  const data = await createUserForCompany(authUser, companyId, payload);

  res.status(201).json({ data });
}
