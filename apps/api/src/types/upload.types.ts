import type { AuthActor } from './auth.types.js';

export type UploadTarget = 'COMPANY_LOGO' | 'PRODUCT_IMAGE' | 'PRODUCT_VIDEO';

export type CreateUploadSignedUrlInput = {
  target: UploadTarget;
  file_name: string;
  content_type: string;
  content_length: number;
  company_id?: string;
  entity_id?: string;
};

export type CreateUploadSignedUrlResult = {
  target: UploadTarget;
  object_key: string;
  bucket: string;
  storage_url: string;
  public_url: string;
  upload_url: string;
  upload_method: 'PUT';
  upload_headers: {
    'Content-Type': string;
  };
  content_type: string;
  content_length: number;
  max_size_bytes: number;
  expires_at: string;
  actor: Pick<AuthActor, 'user_id' | 'role' | 'company_id'>;
};


