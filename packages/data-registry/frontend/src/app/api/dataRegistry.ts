import * as z from 'zod';
import {
  APIOptions,
  handleRestFailures,
  restCREATE,
  restDELETE,
  restGET,
  restPATCH,
  restUPDATE,
} from 'mod-arch-core';
import {
  AssetResponse,
  AssetListResponse,
  VolumeInfo,
  ListVolumesResponse,
  ListNamespacesResponse,
  NamespaceResponse,
  CreateNamespaceRequest,
  CreateVolumeRequest,
  CreateGenericTableRequest,
  LabelListResponse,
  CreateLabelRequest,
  LabelResponse,
  ConnectionRef,
} from '~/app/types';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';

const registryUrl = (path: string) => `${URL_PREFIX}/api/${BFF_API_VERSION}${path}`;

const schemaFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  nullable: z.boolean().optional(),
});

const connectionRefSchema = z.union([
  z.object({ type: z.literal('dch'), id: z.string() }),
  // eslint-disable-next-line camelcase
  z.object({ type: z.literal('rhai'), secret_name: z.string() }),
]);

const assetResponseSchema = z
  .object({
    name: z.string(),
    // eslint-disable-next-line camelcase
    asset_type: z.string(),
    columns: z.array(schemaFieldSchema).nullable().optional(),
    labels: z.array(z.string()).nullable().optional(),
  })
  .passthrough();

const volumeInfoSchema = z
  .object({
    name: z.string(),
    'catalog-name': z.string(),
    'schema-name': z.string(),
    'volume-type': z.string(),
    'storage-location': z.string(),
    labels: z.array(z.string()).nullable().optional(),
    properties: z.record(z.string(), z.string()).optional(),
    // eslint-disable-next-line camelcase
    connection_ref: connectionRefSchema.nullable().optional(),
  })
  .passthrough();

const listVolumesResponseSchema = z.object({
  volumes: z.array(volumeInfoSchema).optional(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getRegistryError = (
  value: unknown,
): { code?: number | string; message: string } | undefined => {
  if (typeof value === 'string' && value.trim()) {
    try {
      return getRegistryError(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const error = isRecord(value.error) ? value.error : undefined;
  const errorMessage = typeof error?.message === 'string' ? error.message : undefined;
  if (errorMessage) {
    const errorCodeValue = error?.code;
    const errorCode =
      typeof errorCodeValue === 'number' || typeof errorCodeValue === 'string'
        ? errorCodeValue
        : undefined;
    return { code: errorCode, message: errorMessage };
  }
  if (typeof value.status_code === 'number' && typeof value.detail === 'string') {
    return { code: value.status_code, message: value.detail };
  }
  return undefined;
};

/**
 * The Data Registry proxy returns its upstream error envelope even for non-2xx responses.
 * Normalize that envelope before passing it to mod-arch-core so handleRestFailures remains the
 * single place that creates the error surfaced to callers.
 */
const handleRegistryRequest = <T>(request: Promise<T>): Promise<T> =>
  handleRestFailures(
    request.then((response) => {
      const registryError = getRegistryError(response);
      if (registryError) {
        const code = registryError.code === undefined ? '' : `status code ${registryError.code}: `;
        return Promise.reject({
          error: {
            code: String(registryError.code ?? 'UNKNOWN'),
            message: `${code}${registryError.message}`,
          },
        });
      }
      return response;
    }),
  );

const get = async <T>(path: string, opts: APIOptions = {}, schema?: z.ZodType<T>): Promise<T> => {
  const response = await handleRegistryRequest(restGET<T>('', registryUrl(path), {}, opts));
  return schema ? schema.parse(response) : response;
};

const create = <T>(
  path: string,
  data: Record<string, unknown>,
  opts: APIOptions = {},
): Promise<T> => handleRegistryRequest(restCREATE<T>('', registryUrl(path), data, {}, opts));

const patch = (path: string, data: Record<string, unknown>, opts: APIOptions = {}): Promise<void> =>
  handleRegistryRequest(
    restPATCH<unknown>('', registryUrl(path), data, {}, { ...opts, parseJSON: false }),
  ).then(() => undefined);

const update = (
  path: string,
  data: Record<string, unknown>,
  opts: APIOptions = {},
): Promise<void> =>
  handleRegistryRequest(
    restUPDATE<unknown>('', registryUrl(path), data, {}, { ...opts, parseJSON: false }),
  ).then(() => undefined);

const remove = (path: string, opts: APIOptions = {}): Promise<void> =>
  handleRegistryRequest(
    restDELETE<unknown>('', registryUrl(path), {}, {}, { ...opts, parseJSON: false }),
  ).then(() => undefined);

const encodedPath = (...parts: string[]): string => parts.map(encodeURIComponent).join('/');

const asRequestBody = (data: object): Record<string, unknown> => ({ ...data });

const getErrorCode = (error: unknown): number | undefined => {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const match = error.message.match(/(?:status code|status|code)\D+(\d{3})\b/i);
  return match ? Number(match[1]) : undefined;
};

// Collections (namespaces)

export const fetchCollections = (
  project: string,
  opts: APIOptions = {},
): Promise<ListNamespacesResponse> => get(`/${encodedPath(project)}/namespaces`, opts);

export const fetchCollectionDetails = (
  project: string,
  collection: string,
  opts: APIOptions = {},
): Promise<NamespaceResponse> =>
  get(`/${encodedPath(project)}/namespaces/${encodedPath(collection)}`, opts);

export const createCollection = (
  project: string,
  data: CreateNamespaceRequest,
  opts: APIOptions = {},
): Promise<NamespaceResponse> =>
  create(`/${encodedPath(project)}/namespaces`, asRequestBody(data), opts);

export const deleteCollection = (
  project: string,
  collection: string,
  opts: APIOptions = {},
): Promise<void> => remove(`/${encodedPath(project)}/namespaces/${encodedPath(collection)}`, opts);

// Assets (generic tables)

export const fetchAssets = (
  project: string,
  collection: string,
  opts: APIOptions = {},
): Promise<AssetListResponse> =>
  get(`/${encodedPath(project)}/namespaces/${encodedPath(collection)}/generic-tables`, opts);

export const fetchGenericTable = (
  project: string,
  collection: string,
  name: string,
  opts: APIOptions = {},
): Promise<AssetResponse> =>
  get(
    `/${encodedPath(project)}/namespaces/${encodedPath(
      collection,
    )}/generic-tables/${encodeURIComponent(name)}`,
    opts,
    assetResponseSchema,
  );

export const deleteGenericTable = (
  project: string,
  collection: string,
  name: string,
  opts: APIOptions = {},
): Promise<void> =>
  remove(
    `/${encodedPath(project)}/namespaces/${encodedPath(
      collection,
    )}/generic-tables/${encodeURIComponent(name)}`,
    opts,
  );

// Volumes

export const fetchVolumes = (
  project: string,
  collection: string,
  opts: APIOptions = {},
): Promise<ListVolumesResponse> =>
  get(
    `/${encodedPath(project)}/namespaces/${encodedPath(collection)}/volumes`,
    opts,
    listVolumesResponseSchema,
  );

export const createVolume = (
  project: string,
  collection: string,
  data: CreateVolumeRequest,
  opts: APIOptions = {},
): Promise<VolumeInfo> =>
  create(
    `/${encodedPath(project)}/namespaces/${encodedPath(collection)}/volumes`,
    asRequestBody(data),
    opts,
  );

export const fetchVolume = (
  project: string,
  collection: string,
  name: string,
  opts: APIOptions = {},
): Promise<VolumeInfo> =>
  get(
    `/${encodedPath(project)}/namespaces/${encodedPath(collection)}/volumes/${encodeURIComponent(
      name,
    )}`,
    opts,
    volumeInfoSchema,
  );

export const deleteVolume = (
  project: string,
  collection: string,
  name: string,
  opts: APIOptions = {},
): Promise<void> =>
  remove(
    `/${encodedPath(project)}/namespaces/${encodedPath(collection)}/volumes/${encodeURIComponent(
      name,
    )}`,
    opts,
  );

// Generic tables (structured assets)

export const createGenericTable = (
  project: string,
  collection: string,
  data: CreateGenericTableRequest,
  opts: APIOptions = {},
): Promise<AssetResponse> =>
  create(
    `/${encodedPath(project)}/namespaces/${encodedPath(collection)}/generic-tables`,
    asRequestBody(data),
    opts,
  );

// Update assets

export type UpdateGenericTableRequest = {
  description?: string;
  format?: string;
  location?: string;
  connection_ref?: ConnectionRef;
  purpose?: string;
  license?: string;
  maturity?: string;
  pii?: string;
  owner?: string;
  add_labels?: string[];
  remove_labels?: string[];
  schema_fields?: { name: string; type: string; description?: string; nullable?: boolean }[];
  properties?: Record<string, string>;
};

export const updateGenericTable = async (
  project: string,
  collection: string,
  name: string,
  data: UpdateGenericTableRequest,
  opts: APIOptions = {},
): Promise<void> =>
  patch(
    `/${encodedPath(project)}/namespaces/${encodedPath(
      collection,
    )}/generic-tables/${encodeURIComponent(name)}`,
    asRequestBody(data),
    opts,
  );

export type UpdateVolumeRequest = {
  comment?: string;
  storage_location?: string;
  owner?: string;
  add_labels?: string[];
  remove_labels?: string[];
  properties?: Record<string, string>;
};

export const updateVolume = async (
  project: string,
  collection: string,
  name: string,
  data: UpdateVolumeRequest,
  opts: APIOptions = {},
): Promise<void> =>
  update(
    `/${encodedPath(project)}/namespaces/${encodedPath(collection)}/volumes/${encodeURIComponent(
      name,
    )}`,
    asRequestBody(data),
    opts,
  );

// Labels

export const fetchLabels = (project: string, opts: APIOptions = {}): Promise<LabelListResponse> =>
  get(`/${encodedPath(project)}/labels`, opts);

export const createLabel = (
  project: string,
  data: CreateLabelRequest,
  opts: APIOptions = {},
): Promise<LabelResponse> => create(`/${encodedPath(project)}/labels`, asRequestBody(data), opts);

export const deleteLabel = (project: string, label: string, opts: APIOptions = {}): Promise<void> =>
  remove(`/${encodedPath(project)}/labels/${encodeURIComponent(label)}`, opts);

// Error type guards

export const is503Error = (error: unknown): boolean =>
  getErrorCode(error) === 503 ||
  (error instanceof Error && error.message.toLowerCase().includes('service unavailable'));

export const is403Error = (error: unknown): boolean =>
  getErrorCode(error) === 403 ||
  (error instanceof Error && /access (?:denied|forbidden)/i.test(error.message));

export const isConflictError = (error: unknown): boolean =>
  getErrorCode(error) === 409 ||
  (error instanceof Error && /(?:already exists|conflict|not empty)/i.test(error.message));

export const isConnectionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch') ||
    error.message.toLowerCase().includes('network') ||
    error.message === 'Error communicating with server');
