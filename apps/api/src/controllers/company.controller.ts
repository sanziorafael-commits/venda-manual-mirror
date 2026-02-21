import type { Request, Response } from 'express';

import {
  companyParamSchema,
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

export async function listCompaniesHandler(req: Request, res: Response) {
  const query = companyQuerySchema.parse(req.query);
  const result = await listCompanies(query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getCompanyByIdHandler(req: Request, res: Response) {
  const { company_id } = companyParamSchema.parse(req.params);
  const data = await getCompanyById(company_id);

  res.status(200).json({ data });
}

export async function createCompanyHandler(req: Request, res: Response) {
  const payload = createCompanySchema.parse(req.body);
  const data = await createCompany(payload);

  res.status(201).json({ data });
}

export async function updateCompanyHandler(req: Request, res: Response) {
  const { company_id } = companyParamSchema.parse(req.params);
  const payload = updateCompanySchema.parse(req.body);
  const data = await updateCompany(company_id, payload);

  res.status(200).json({ data });
}

export async function deleteCompanyHandler(req: Request, res: Response) {
  const { company_id } = companyParamSchema.parse(req.params);
  await deleteCompany(company_id);

  res.status(200).json({ data: { ok: true } });
}

export async function createCompanyUserHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const { company_id } = companyParamSchema.parse(req.params);
  const payload = createCompanyUserSchema.parse(req.body);
  const data = await createUserForCompany(authUser, company_id, payload);

  res.status(201).json({ data });
}


