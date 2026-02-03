import { Request, Response } from 'express';

import { getHealth } from '../services/health.service.js';

export function getHealthHandler(_req: Request, res: Response) {
  const data = getHealth();
  res.status(200).json({ data });
}
