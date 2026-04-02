import {
  APIOptions,
  restGET,
  handleRestFailures,
  isModArchResponse,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '../utilities/const';
import { MaaSAuthPolicy } from '../types/subscriptions';

/** GET /api/v1/all-policies - List all policies */
export const listAuthPolicies =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSAuthPolicy[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/all-policies`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<MaaSAuthPolicy[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/delete-policy/:name - Delete a policy */
export const deleteAuthPolicy =
  (hostPath = '') =>
  (opts: APIOptions, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/delete-policy/${encodeURIComponent(name)}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<void>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
