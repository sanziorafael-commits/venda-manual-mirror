import type { Request, Response } from 'express';
import { z } from 'zod';

import { createUserSchema, updateUserSchema, userQuerySchema } from '../schemas/user.schema.js';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from '../services/user.service.js';
import { unauthorized } from '../utils/app-error.js';

const userParamSchema = z.object({
  userId: z.string().cuid(),
});

export async function listUsersHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const query = userQuerySchema.parse(req.query);
  const result = await listUsers(authUser, query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getUserByIdHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const { userId } = userParamSchema.parse(req.params);
  const data = await getUserById(authUser, userId);
  res.status(200).json({ data });
}

export async function createUserHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const payload = createUserSchema.parse(req.body);
  const data = await createUser(authUser, payload);

  res.status(201).json({ data });
}

export async function updateUserHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const { userId } = userParamSchema.parse(req.params);
  const payload = updateUserSchema.parse(req.body);
  const data = await updateUser(authUser, userId, payload);

  res.status(200).json({ data });
}

export async function deleteUserHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const { userId } = userParamSchema.parse(req.params);
  await deleteUser(authUser, userId);
  res.status(200).json({ data: { ok: true } });
}
