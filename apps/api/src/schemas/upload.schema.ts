import { z } from 'zod';

export const uploadTargetSchema = z.enum(['COMPANY_LOGO', 'PRODUCT_IMAGE', 'PRODUCT_VIDEO']);

export const createUploadSignedUrlSchema = z.object({
  target: uploadTargetSchema,
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(3).max(120),
  contentLength: z.coerce.number().int().positive().max(500 * 1024 * 1024),
  companyId: z.string().cuid().optional(),
  entityId: z.string().trim().min(1).max(100).optional(),
}).superRefine((value, context) => {
  const isProductUpload = value.target === 'PRODUCT_IMAGE' || value.target === 'PRODUCT_VIDEO';

  if (isProductUpload && !value.entityId) {
    context.addIssue({
      code: 'custom',
      path: ['entityId'],
      message: 'entityId e obrigatorio para upload de midia de produto',
    });
  }
});
