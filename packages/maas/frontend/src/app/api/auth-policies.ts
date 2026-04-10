import {
  APIOptions,
  assembleModArchBody,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
  restUPDATE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type {
  CreatePolicyRequest,
  PolicyInfoResponse,
  UpdatePolicyRequest,
} from '~/app/types/auth-policies';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { isMaaSAuthPolicy, isMaaSModelRefSummary } from './subscriptions';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isPolicyInfoResponse = (v: unknown): v is PolicyInfoResponse =>
  isRecord(v) &&
  isMaaSAuthPolicy(v.policy) &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSModelRefSummary);

const isDeleteAuthPolicyResponse = (v: unknown): v is { message: string } =>
  isRecord(v) && typeof v.message === 'string';

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

/** GET /api/v1/view-policy/:name - Policy details for edit / view / view details */
export const getPolicyInfo =
  (name: string, hostPath = '') =>
  (opts: APIOptions): Promise<PolicyInfoResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/view-policy/${encodeURIComponent(name)}`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isPolicyInfoResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/new-policy - Create policy */
export const createAuthPolicy =
  (hostPath = '') =>
  (opts: APIOptions, request: CreatePolicyRequest): Promise<MaaSAuthPolicy> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/new-policy`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSAuthPolicy(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** PUT /api/v1/update-policy/:name - Update policy */
export const updateAuthPolicy =
  (name: string, hostPath = '') =>
  (opts: APIOptions, request: UpdatePolicyRequest): Promise<MaaSAuthPolicy> =>
    handleRestFailures(
      restUPDATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/update-policy/${encodeURIComponent(name)}`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSAuthPolicy(response.data)) {
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
