import type { AuthActor } from './auth.types.js';

export type UploadTarget = 'COMPANY_LOGO' | 'PRODUCT_IMAGE' | 'PRODUCT_VIDEO';

export type CreateUploadSignedUrlInput = {
  target: UploadTarget;
  fileName: string;
  contentType: string;
  contentLength: number;
  companyId?: string;
  entityId?: string;
};

export type CreateUploadSignedUrlResult = {
  target: UploadTarget;
  objectKey: string;
  bucket: string;
  storageUrl: string;
  publicUrl: string;
  uploadUrl: string;
  uploadMethod: 'PUT';
  uploadHeaders: {
    'Content-Type': string;
  };
  contentType: string;
  contentLength: number;
  maxSizeBytes: number;
  expiresAt: string;
  actor: Pick<AuthActor, 'userId' | 'role' | 'companyId'>;
};
