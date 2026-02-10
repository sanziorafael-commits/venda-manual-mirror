import type { Request, Response } from 'express';

import { updateMeSchema } from '../schemas/auth.schema.js';
import { getMe, updateMe } from '../services/auth.service.js';

export async function getMeHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const data = await getMe(authUser.userId);

  res.status(200).json({ data });
}

export async function updateMeHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const payload = updateMeSchema.parse(req.body);
  const data = await updateMe(authUser.userId, payload);

  res.status(200).json({ data });
}
