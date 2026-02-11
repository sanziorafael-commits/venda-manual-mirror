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
  maxSizeBytes: number;
  allowedRoles: UserRole[];
  allowedMimePrefixes: Array<'image/' | 'video/'>;
  allowedMimeExact?: string[];
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
    maxSizeBytes: 3 * 1024 * 1024,
    allowedRoles: [UserRole.ADMIN],
    allowedMimePrefixes: [],
    allowedMimeExact: IMAGE_ALLOWED_MIME_TYPES,
  },
  PRODUCT_IMAGE: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedRoles: [UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR],
    allowedMimePrefixes: [],
    allowedMimeExact: IMAGE_ALLOWED_MIME_TYPES,
  },
  PRODUCT_VIDEO: {
    maxSizeBytes: 150 * 1024 * 1024,
    allowedRoles: [UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR],
    allowedMimePrefixes: ['video/'],
  },
};

export async function createUploadSignedUrl(
  actor: AuthActor,
  input: CreateUploadSignedUrlInput,
): Promise<CreateUploadSignedUrlResult> {
  const policy = UPLOAD_TARGET_POLICY[input.target];

  if (!policy.allowedRoles.includes(actor.role)) {
    throw forbidden('Você não tem permissão para este tipo de upload');
  }

  assertContentTypeAllowed(input.contentType, policy);
  assertContentLengthAllowed(input.contentLength, policy.maxSizeBytes);

  const companySegment = resolveCompanySegment(actor, input);
  const pathSegments = resolvePathSegments(input, companySegment);

  const objectKey = buildStorageObjectKey({
    pathSegments,
    fileName: input.fileName,
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
    contentType: input.contentType,
  });

  return {
    target: input.target,
    objectKey: signedUpload.objectKey,
    bucket: signedUpload.bucket,
    storageUrl: signedUpload.storageUrl,
    publicUrl: signedUpload.publicUrl,
    uploadUrl: signedUpload.uploadUrl,
    uploadMethod: 'PUT',
    uploadHeaders: {
      'Content-Type': input.contentType,
    },
    contentType: input.contentType,
    contentLength: input.contentLength,
    maxSizeBytes: policy.maxSizeBytes,
    expiresAt: signedUpload.expiresAt,
    actor: {
      userId: actor.userId,
      role: actor.role,
      companyId: actor.companyId,
    },
  };
}

function resolveCompanySegment(actor: AuthActor, input: CreateUploadSignedUrlInput) {
  if (actor.role === UserRole.ADMIN) {
    if (input.target === 'COMPANY_LOGO' && !input.companyId) {
      throw badRequest('companyId é obrigatório para upload de logo de empresa');
    }

    return input.companyId ?? 'admin';
  }

  if (!actor.companyId) {
    throw forbidden('Seu usuário não possui escopo de empresa para upload');
  }

  if (input.companyId && input.companyId !== actor.companyId) {
    throw forbidden('Você não pode subir arquivos para outra empresa');
  }

  return actor.companyId;
}

function resolvePathSegments(input: CreateUploadSignedUrlInput, companySegment: string) {
  if (input.target === 'COMPANY_LOGO') {
    return ['companies', companySegment, 'logo'];
  }

  if (!input.entityId?.trim()) {
    throw badRequest('entityId e obrigatorio para upload de midia de produto');
  }

  if (input.target === 'PRODUCT_IMAGE') {
    return ['companies', companySegment, 'products', input.entityId, 'images'];
  }

  return ['companies', companySegment, 'products', input.entityId, 'videos'];
}

function assertContentLengthAllowed(contentLength: number, maxSizeBytes: number) {
  if (contentLength > maxSizeBytes) {
    throw badRequest('Arquivo excede o tamanho máximo permitido', {
      maxSizeBytes,
      contentLength,
    });
  }
}

function assertContentTypeAllowed(contentType: string, policy: UploadTargetPolicy) {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  const matchesPrefix = policy.allowedMimePrefixes.some((prefix) => normalized.startsWith(prefix));
  const matchesExact = policy.allowedMimeExact?.includes(normalized) ?? false;

  if (!matchesPrefix && !matchesExact) {
    throw badRequest('Tipo de arquivo não permitido para este upload', {
      contentType,
      allowedMimePrefixes: policy.allowedMimePrefixes,
      allowedMimeExact: policy.allowedMimeExact ?? [],
    });
  }
}
