import {
  APIOptions,
  restGET,
  handleRestFailures,
  isModArchResponse,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { isMaaSAuthPolicy } from './subscriptions';

const isDeleteAuthPolicyResponse = (v: unknown): v is { message: string } =>
  typeof v === 'object' && v !== null && 'message' in v && typeof v.message === 'string';

/** GET /api/v1/all-policies - List all policies */
export const listAuthPolicies =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSAuthPolicy[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/all-policies`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<MaaSAuthPolicy[]>(response) && response.data.every(isMaaSAuthPolicy)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/delete-policy/:name - Delete a policy */
export const deleteAuthPolicy =
  (hostPath = '') =>
  (opts: APIOptions, name: string): Promise<{ message: string }> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/delete-policy/${encodeURIComponent(name)}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (
        isModArchResponse<{ message: string }>(response) &&
        isDeleteAuthPolicyResponse(response.data)
      ) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
