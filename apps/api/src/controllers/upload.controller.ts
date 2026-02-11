import type { Request, Response } from 'express';

import { createUploadSignedUrlSchema } from '../schemas/upload.schema.js';
import { createUploadSignedUrl } from '../services/upload.service.js';

export async function createUploadSignedUrlHandler(req: Request, res: Response) {
  const authUser = req.authUser!;
  const payload = createUploadSignedUrlSchema.parse(req.body);
  const data = await createUploadSignedUrl(authUser, payload);

  res.status(200).json({ data });
}
