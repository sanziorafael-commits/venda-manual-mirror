import { UserRole } from '@prisma/client';

import type { AuthActor } from '../types/auth.types.js';
import type {
  CreateUploadSignedUrlInput,
  CreateUploadSignedUrlResult,
  UploadTarget,
} from '../types/upload.types.js';
import { badRequest, forbidden } from '../utils/app-error.js';

import { buildStorageObjectKey, createStorageSignedUploadUrl } from './storage.service.js';

type UploadTargetPolicy = {
  max_size_bytes: number;
  allowed_roles: UserRole[];
  allowed_mime_prefixes: Array<'image/' | 'video/'>;
  allowed_mime_exact?: string[];
};

const IMAGE_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/gif',
];

const UPLOAD_TARGET_POLICY: Record<UploadTarget, UploadTargetPolicy> = {
  COMPANY_LOGO: {
    max_size_bytes: 3 * 1024 * 1024,
    allowed_roles: [UserRole.ADMIN],
    allowed_mime_prefixes: [],
    allowed_mime_exact: IMAGE_ALLOWED_MIME_TYPES,
  },
  PRODUCT_IMAGE: {
    max_size_bytes: 3 * 1024 * 1024,
    allowed_roles: [UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR],
    allowed_mime_prefixes: [],
    allowed_mime_exact: IMAGE_ALLOWED_MIME_TYPES,
  },
  PRODUCT_VIDEO: {
    max_size_bytes: 100 * 1024 * 1024,
    allowed_roles: [UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR],
    allowed_mime_prefixes: ['video/'],
  },
};

export async function createUploadSignedUrl(
  actor: AuthActor,
  input: CreateUploadSignedUrlInput,
): Promise<CreateUploadSignedUrlResult> {
  const policy = UPLOAD_TARGET_POLICY[input.target];

  if (!policy.allowed_roles.includes(actor.role)) {
    throw forbidden('Você não tem permissão para este tipo de upload');
  }

  assertContentTypeAllowed(input.content_type, policy);
  assertContentLengthAllowed(input.content_length, policy.max_size_bytes);

  const companySegment = resolveCompanySegment(actor, input);
  const pathSegments = resolvePathSegments(input, companySegment);

  const objectKey = buildStorageObjectKey({
    pathSegments,
    fileName: input.file_name,
    ...(input.target === 'COMPANY_LOGO'
      ? {
          partitionByDate: false,
          appendUniqueSuffix: false,
          fixedFileNameBase: 'logo',
        }
      : {}),
  });

  const signedUpload = await createStorageSignedUploadUrl({
    objectKey,
    contentType: input.content_type,
  });

  return {
    target: input.target,
    object_key: signedUpload.objectKey,
    bucket: signedUpload.bucket,
    storage_url: signedUpload.storageUrl,
    public_url: signedUpload.publicUrl,
    upload_url: signedUpload.uploadUrl,
    upload_method: 'PUT',
    upload_headers: {
      'Content-Type': input.content_type,
    },
    content_type: input.content_type,
    content_length: input.content_length,
    max_size_bytes: policy.max_size_bytes,
    expires_at: signedUpload.expiresAt,
    actor: {
      user_id: actor.user_id,
      role: actor.role,
      company_id: actor.company_id,
    },
  };
}

function resolveCompanySegment(actor: AuthActor, input: CreateUploadSignedUrlInput) {
  if (actor.role === UserRole.ADMIN) {
    if (input.target === 'COMPANY_LOGO' && !input.company_id) {
      throw badRequest('company_id é obrigatório para upload de logo de empresa');
    }

    return input.company_id ?? 'admin';
  }

  if (!actor.company_id) {
    throw forbidden('Seu usuário não possui escopo de empresa para upload');
  }

  if (input.company_id && input.company_id !== actor.company_id) {
    throw forbidden('Você não pode subir arquivos para outra empresa');
  }

  return actor.company_id;
}

function resolvePathSegments(input: CreateUploadSignedUrlInput, companySegment: string) {
  if (input.target === 'COMPANY_LOGO') {
    return ['companies', companySegment, 'logo'];
  }

  if (!input.entity_id?.trim()) {
    throw badRequest('entity_id e obrigatorio para upload de midia de produto');
  }

  if (input.target === 'PRODUCT_IMAGE') {
    return ['companies', companySegment, 'products', input.entity_id, 'images'];
  }

  return ['companies', companySegment, 'products', input.entity_id, 'videos'];
}

function assertContentLengthAllowed(content_length: number, max_size_bytes: number) {
  if (content_length > max_size_bytes) {
    throw badRequest('Arquivo excede o tamanho máximo permitido', {
      max_size_bytes,
      content_length,
    });
  }
}

function assertContentTypeAllowed(content_type: string, policy: UploadTargetPolicy) {
  const normalized = content_type.split(';')[0]?.trim().toLowerCase() ?? '';
  const matchesPrefix = policy.allowed_mime_prefixes.some((prefix) => normalized.startsWith(prefix));
  const matchesExact = policy.allowed_mime_exact?.includes(normalized) ?? false;

  if (!matchesPrefix && !matchesExact) {
    throw badRequest('Tipo de arquivo não permitido para este upload', {
      content_type,
      allowed_mime_prefixes: policy.allowed_mime_prefixes,
      allowed_mime_exact: policy.allowed_mime_exact ?? [],
    });
  }
}


