import {
  APIOptions,
  assembleModArchBody,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type {
  APIKeyListResponse,
  APIKeySearchRequest,
  BulkRevokeResponse,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  APIKey,
} from '~/app/types/api-key';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isAPIKey = (v: unknown): v is APIKey =>
  isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string';

const isAPIKeyListResponse = (v: unknown): v is APIKeyListResponse =>
  isRecord(v) &&
  (Array.isArray(v.data) || v.data === null) &&
  typeof v.has_more === 'boolean' &&
  typeof v.object === 'string' &&
  (v.data === null || v.data.every(isAPIKey));

const isCreateAPIKeyResponse = (v: unknown): v is CreateAPIKeyResponse =>
  isRecord(v) &&
  typeof v.key === 'string' &&
  typeof v.keyPrefix === 'string' &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.createdAt === 'string' &&
  (v.expiresAt === undefined || typeof v.expiresAt === 'string');

const isBulkRevokeResponse = (v: unknown): v is BulkRevokeResponse =>
  isRecord(v) && typeof v.revokedCount === 'number' && typeof v.message === 'string';

/** POST /api/v1/api-keys/search - Search API keys with optional filters, sorting, and pagination */
export const searchApiKeys =
  (hostPath = '') =>
  (opts: APIOptions, request: APIKeySearchRequest = {}): Promise<APIKeyListResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys/search`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isAPIKeyListResponse(response.data)) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return { ...response.data, data: response.data.data ?? [] };
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/api-keys - Create a new API key */
export const createApiKey =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isCreateAPIKeyResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/api-keys/bulk-revoke - Revoke all API keys for a user */
export const bulkRevokeApiKeys =
  (hostPath = '') =>
  (opts: APIOptions, username: string): Promise<BulkRevokeResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys/bulk-revoke`,
        assembleModArchBody({ username }),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isBulkRevokeResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/api-keys/:id - Revoke a specific API key */
export const revokeApiKey =
  (hostPath = '') =>
  (opts: APIOptions, keyId: string): Promise<APIKey> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys/${encodeURIComponent(keyId)}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isAPIKey(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
