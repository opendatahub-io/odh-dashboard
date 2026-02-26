import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { EvaluationJob, ListEvaluationJobsParams, NamespaceKind } from '~/app/types';

export const getUser =
  (hostPath: string) =>
  (opts: APIOptions): Promise<UserSettings> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/user`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<UserSettings>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getNamespaces =
  (hostPath: string) =>
  (opts: APIOptions): Promise<NamespaceKind[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/namespaces`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<NamespaceKind[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getEvaluationJobs =
  (hostPath: string, params?: ListEvaluationJobsParams) =>
  (opts: APIOptions): Promise<EvaluationJob[]> => {
    const queryParams: Record<string, string> = {};
    if (params?.namespace) {
      queryParams.namespace = params.namespace;
    }
    if (params?.limit != null) {
      queryParams.limit = String(params.limit);
    }
    if (params?.offset != null) {
      queryParams.offset = String(params.offset);
    }
    if (params?.status) {
      queryParams.status = params.status;
    }
    if (params?.name) {
      queryParams.name = params.name;
    }
    if (params?.tags) {
      queryParams.tags = params.tags;
    }

    return handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<EvaluationJob[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };
