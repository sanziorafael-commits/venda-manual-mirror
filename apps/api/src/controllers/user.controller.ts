import type { Request, Response } from 'express';

import {
  createUserSchema,
  reassignManagerTeamSchema,
  reassignSupervisorSchema,
  updateUserSchema,
  userParamSchema,
  userQuerySchema,
} from '../schemas/user.schema.js';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  reassignManagerTeam,
  reassignSupervisor,
  updateUser,
} from '../services/user.service.js';

export async function listUsersHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const query = userQuerySchema.parse(req.query);
  const result = await listUsers(authUser, query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getUserByIdHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const { user_id } = userParamSchema.parse(req.params);
  const data = await getUserById(authUser, user_id);

  res.status(200).json({ data });
}

export async function createUserHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const payload = createUserSchema.parse(req.body);
  const data = await createUser(authUser, payload);

  res.status(201).json({ data });
}

export async function updateUserHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const { user_id } = userParamSchema.parse(req.params);
  const payload = updateUserSchema.parse(req.body);
  const data = await updateUser(authUser, user_id, payload);

  res.status(200).json({ data });
}

export async function deleteUserHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const { user_id } = userParamSchema.parse(req.params);
  await deleteUser(authUser, user_id);

  res.status(200).json({ data: { ok: true } });
}

export async function reassignSupervisorHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const payload = reassignSupervisorSchema.parse(req.body);
  const data = await reassignSupervisor(authUser, payload);

  res.status(200).json({ data });
}

export async function reassignManagerTeamHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const payload = reassignManagerTeamSchema.parse(req.body);
  const data = await reassignManagerTeam(authUser, payload);

  res.status(200).json({ data });
}


