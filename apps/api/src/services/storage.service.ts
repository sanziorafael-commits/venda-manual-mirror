import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Storage, type StorageOptions } from '@google-cloud/storage';
import { z } from 'zod';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { badRequest } from '../utils/app-error.js';
import { ttlToDate } from '../utils/time.js';

type CreateStorageSignedUploadUrlInput = {
  objectKey: string;
  contentType: string;
};

type CreateStorageSignedUploadUrlResult = {
  bucket: string;
  objectKey: string;
  storageUrl: string;
  publicUrl: string;
  uploadUrl: string;
  expiresAt: string;
};

type CreateStorageSignedReadUrlByPublicUrlResult = {
  readUrl: string;
  expiresAt: string;
};

const serviceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  project_id: z.string().optional(),
});

let storageClient: Storage | null = null;

export async function createStorageSignedUploadUrl(
  input: CreateStorageSignedUploadUrlInput,
): Promise<CreateStorageSignedUploadUrlResult> {
  if (env.STORAGE_PROVIDER !== 'gcs') {
    throw badRequest('Storage de arquivos está desabilitado no ambiente atual');
  }

  const bucketName = env.GCS_BUCKET_NAME!;
  const client = getStorageClient();
  const bucket = client.bucket(bucketName);
  const file = bucket.file(input.objectKey);
  const expiresAtDate = ttlToDate(env.STORAGE_UPLOAD_URL_TTL);

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAtDate,
    contentType: input.contentType,
  });

  return {
    bucket: bucketName,
    objectKey: input.objectKey,
    storageUrl: `gs://${bucketName}/${input.objectKey}`,
    publicUrl: buildPublicUrl(bucketName, input.objectKey),
    uploadUrl,
    expiresAt: expiresAtDate.toISOString(),
  };
}

export async function createStorageSignedReadUrlByPublicUrl(
  publicUrl: string,
): Promise<CreateStorageSignedReadUrlByPublicUrlResult | null> {
  if (env.STORAGE_PROVIDER !== 'gcs') {
    return null;
  }

  const parsed = parsePublicUrl(publicUrl);
  if (!parsed) {
    return null;
  }

  const client = getStorageClient();
  const bucket = client.bucket(parsed.bucketName);
  const file = bucket.file(parsed.objectKey);
  const expiresAtDate = ttlToDate(env.STORAGE_READ_URL_TTL);

  const [readUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAtDate,
  });

  return {
    readUrl,
    expiresAt: expiresAtDate.toISOString(),
  };
}

export async function deleteStorageObjectByPublicUrl(publicUrl: string) {
  if (env.STORAGE_PROVIDER !== 'gcs') {
    return { deleted: false, reason: 'storage_disabled' as const };
  }

  const parsed = parsePublicUrl(publicUrl);
  if (!parsed) {
    return { deleted: false, reason: 'url_not_managed' as const };
  }

  const client = getStorageClient();
  const bucket = client.bucket(parsed.bucketName);
  const file = bucket.file(parsed.objectKey);

  await file.delete({ ignoreNotFound: true });
  return { deleted: true };
}

export function buildStorageObjectKey(parts: {
  pathSegments: string[];
  fileName: string;
  partitionByDate?: boolean;
  appendUniqueSuffix?: boolean;
  fixedFileNameBase?: string;
}) {
  const partitionByDate = parts.partitionByDate ?? true;
  const appendUniqueSuffix = parts.appendUniqueSuffix ?? true;
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const randomSuffix = randomUUID().replace(/-/g, '').slice(0, 16);
  const sanitizedFileName = sanitizeFileName(parts.fileName);
  const finalFileName = buildFinalFileName({
    sanitizedFileName,
    fixedFileNameBase: parts.fixedFileNameBase,
    appendUniqueSuffix,
    timestamp: Date.now(),
    randomSuffix,
  });

  return [
    ...parts.pathSegments.map((segment) => sanitizePathSegment(segment)),
    ...(partitionByDate ? [year, month] : []),
    finalFileName,
  ]
    .filter((value): value is string => Boolean(value))
    .join('/');
}

function getStorageClient() {
  if (storageClient) {
    return storageClient;
  }

  const storageOptions: StorageOptions = {
    ...(env.GCS_PROJECT_ID ? { projectId: env.GCS_PROJECT_ID } : {}),
  };

  const credentials = resolveServiceAccountCredentials();
  if (credentials) {
    storageOptions.credentials = credentials;
  }

  storageClient = new Storage(storageOptions);
  return storageClient;
}

function resolveServiceAccountCredentials() {
  if (env.GCS_CREDENTIALS_FILE?.trim()) {
    const credentialsFromFile = readServiceAccountFromFile(env.GCS_CREDENTIALS_FILE);
    if (credentialsFromFile) {
      return credentialsFromFile;
    }
  }

  const parsedJsonCredentials = parseCredentialsFromJson(
    env.GCS_CREDENTIALS_JSON,
    'GCS_CREDENTIALS_JSON',
  );
  if (parsedJsonCredentials) {
    return parsedJsonCredentials;
  }

  const parsedBase64Credentials = parseCredentialsFromBase64(env.GCS_CREDENTIALS_BASE64);
  if (parsedBase64Credentials) {
    return parsedBase64Credentials;
  }

  if (env.GCS_CLIENT_EMAIL?.trim() && env.GCS_PRIVATE_KEY?.trim()) {
    return {
      client_email: env.GCS_CLIENT_EMAIL.trim(),
      private_key: env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ...(env.GCS_PROJECT_ID ? { project_id: env.GCS_PROJECT_ID } : {}),
    };
  }

  return undefined;
}

function parseCredentialsFromBase64(rawCredentialsBase64?: string) {
  if (!rawCredentialsBase64?.trim()) {
    return null;
  }

  try {
    const decodedJson = Buffer.from(rawCredentialsBase64, 'base64').toString('utf8');
    return parseCredentialsFromJson(decodedJson, 'GCS_CREDENTIALS_BASE64');
  } catch (error) {
    logger.error({ err: error }, 'não foi possível decodificar GCS_CREDENTIALS_BASE64');
    throw badRequest('Credenciais GCS inválidas');
  }
}

function parseCredentialsFromJson(rawJson?: string, sourceLabel?: string) {
  if (!rawJson?.trim()) {
    return null;
  }

  try {
    const parsedJson = JSON.parse(rawJson) as unknown;
    const parsedCredentials = serviceAccountSchema.parse(parsedJson);

    return {
      client_email: parsedCredentials.client_email,
      private_key: parsedCredentials.private_key.replace(/\\n/g, '\n'),
      ...(parsedCredentials.project_id ? { project_id: parsedCredentials.project_id } : {}),
    };
  } catch (error) {
    logger.error({ err: error, sourceLabel }, 'credenciais GCS inválidas');
    throw badRequest('Credenciais GCS inválidas');
  }
}

function buildPublicUrl(bucketName: string, objectKey: string) {
  if (env.GCS_PUBLIC_BASE_URL) {
    const normalizedBaseUrl = env.GCS_PUBLIC_BASE_URL.endsWith('/')
      ? env.GCS_PUBLIC_BASE_URL.slice(0, -1)
      : env.GCS_PUBLIC_BASE_URL;

    return `${normalizedBaseUrl}/${encodePath(objectKey)}`;
  }

  return `https://storage.googleapis.com/${bucketName}/${encodePath(objectKey)}`;
}

function parsePublicUrl(publicUrl: string) {
  try {
    const url = new URL(publicUrl);

    if (env.GCS_PUBLIC_BASE_URL) {
      const baseUrl = new URL(env.GCS_PUBLIC_BASE_URL);

      if (
        url.origin === baseUrl.origin &&
        url.pathname.startsWith(baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`)
      ) {
        const prefixPath = baseUrl.pathname.endsWith('/')
          ? baseUrl.pathname
          : `${baseUrl.pathname}/`;
        const relativePath = url.pathname.slice(prefixPath.length);
        const objectKey = decodePath(relativePath);

        return {
          bucketName: env.GCS_BUCKET_NAME!,
          objectKey,
        };
      }
    }

    const expectedPrefix = `/` + env.GCS_BUCKET_NAME! + `/`;
    if (url.hostname === 'storage.googleapis.com' && url.pathname.startsWith(expectedPrefix)) {
      const objectKey = decodePath(url.pathname.slice(expectedPrefix.length));

      return {
        bucketName: env.GCS_BUCKET_NAME!,
        objectKey,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodePath(path: string) {
  return path
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

function sanitizePathSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'default';
}

function sanitizeFileName(fileName: string) {
  const parts = fileName.split(/[\\/]/);
  const rawBaseName = parts[parts.length - 1] ?? 'arquivo';
  const baseNameWithoutDots = rawBaseName.replace(/^\.+/, '');

  const normalized = baseNameWithoutDots
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'arquivo';
}

function buildFinalFileName(input: {
  sanitizedFileName: string;
  fixedFileNameBase?: string;
  appendUniqueSuffix: boolean;
  timestamp: number;
  randomSuffix: string;
}) {
  const extension = getFileExtension(input.sanitizedFileName);

  if (input.fixedFileNameBase?.trim()) {
    const sanitizedBaseName = sanitizePathSegment(input.fixedFileNameBase);
    return extension ? `${sanitizedBaseName}.${extension}` : sanitizedBaseName;
  }

  if (!input.appendUniqueSuffix) {
    return input.sanitizedFileName;
  }

  return `${input.timestamp}-${input.randomSuffix}-${input.sanitizedFileName}`;
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return '';
  }

  return fileName.slice(dotIndex + 1);
}

export function readServiceAccountFromFile(filePath: string) {
  try {
    const rawJson = readFileSync(filePath, 'utf8');
    return parseCredentialsFromJson(rawJson, 'file');
  } catch (error) {
    logger.error({ err: error, filePath }, 'não foi possível ler o arquivo de credenciais GCS');
    throw badRequest('Arquivo de credenciais GCS inválido');
  }
}

