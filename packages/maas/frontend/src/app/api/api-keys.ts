import {
  APIOptions,
  assembleModArchBody,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
  restCREATE,
  assembleModArchBody,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { type APIKey } from '~/app/types/api-key';

/** GET /api/v1/api-keys - Fetch the list of api keys (metadata only, not the actual token values) */
export const getApiKeys =
  (hostPath = '') =>
  (opts: APIOptions): Promise<APIKey[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<APIKey[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export type CreateAPIKeyRequest = {
  name?: string;
  description?: string;
  expiration?: string;
};

export type CreateAPIKeyResponse = {
  token: string;
  expiration: string;
  expiresAt: number;
  jti: string;
  name?: string;
  description?: string;
};

/** POST /api/v1/api-key - Create a new API key */
export const createApiKey =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/api-key`,
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

/** DELETE /api/v1/api-keys - Delete all API keys */
export const deleteAllApiKeys =
  (hostPath = '') =>
  (opts: APIOptions): Promise<void> =>
    handleRestFailures(
      restDELETE(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/api-keys`, {}, {}, opts),
    ).then((response) => {
      if (isModArchResponse<void>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export type APIKeyCreateRequest = {
  name?: string;
  description?: string;
  expiration?: string;
};
export type APIKeyCreateResponse = {
  token: string;
  expiration: string;
  expiresAt: number;
  jti?: string;
  name?: string;
  description?: string;
};
/** POST /api/v1/api-key - Create a new API key
 * @param apiKey - Optional details to set for the new API key
 * @returns The created API key details (this is the only way to get the token value as of now)
 */
export const createAPIKey =
  (hostPath = '') =>
  (opts: APIOptions, apiKey: APIKeyCreateRequest): Promise<APIKeyCreateResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/api-key`,
        assembleModArchBody(apiKey),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<APIKeyCreateResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
