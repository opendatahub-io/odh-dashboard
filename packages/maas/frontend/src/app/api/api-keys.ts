import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { type APIKey } from '~/app/types/api-key';

/** GET /api/v1/api-keys - Fetch the list of api keys */
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
