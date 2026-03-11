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
      if (isModArchResponse<APIKeyListResponse>(response)) {
        return response.data;
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
      if (isModArchResponse<CreateAPIKeyResponse>(response)) {
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
      if (isModArchResponse<BulkRevokeResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/api-keys/:id - Revoke a specific API key */
export const revokeApiKey =
  (hostPath = '') =>
  (opts: APIOptions, keyId: string): Promise<APIKey> =>
    handleRestFailures(
      restDELETE(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys/${keyId}`, {}, {}, opts),
    ).then((response) => {
      if (isModArchResponse<APIKey>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
