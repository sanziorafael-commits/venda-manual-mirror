import { z } from 'zod';

export const uploadTargetSchema = z.enum(['COMPANY_LOGO', 'PRODUCT_IMAGE', 'PRODUCT_VIDEO']);

export const createUploadSignedUrlSchema = z.object({
  target: uploadTargetSchema,
  file_name: z.string().trim().min(1).max(255),
  content_type: z.string().trim().min(3).max(120),
  content_length: z.coerce.number().int().positive().max(500 * 1024 * 1024),
  company_id: z.string().uuid().optional(),
  entity_id: z.string().trim().min(1).max(100).optional(),
}).superRefine((value, context) => {
  const isProductUpload = value.target === 'PRODUCT_IMAGE' || value.target === 'PRODUCT_VIDEO';

  if (isProductUpload && !value.entity_id) {
    context.addIssue({
      code: 'custom',
      path: ['entity_id'],
      message: 'entity_id e obrigatorio para upload de midia de produto',
    });
  }
});


