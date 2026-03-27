import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  Collection,
  CollectionsListResponse,
  EvalHubCRStatus,
  EvalHubHealthResponse,
  CreateEvaluationJobRequest,
  CreateEvaluationJobResponse,
  EvaluationJob,
  EvaluationJobsResponse,
  ListCollectionsParams,
  ListEvaluationJobsParams,
  NamespaceKind,
  Provider,
  ProvidersResponse,
} from '~/app/types';

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

export const getEvalHubCRStatus =
  (hostPath: string, namespace: string) =>
  (opts: APIOptions): Promise<EvalHubCRStatus | null> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/evalhub/status`, { namespace }, opts),
    ).then((response) => {
      if (isModArchResponse<EvalHubCRStatus | null>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getEvalHubHealth =
  (hostPath: string) =>
  (opts: APIOptions): Promise<EvalHubHealthResponse> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/evalhub/health`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<EvalHubHealthResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid health response format');
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
      if (isModArchResponse<EvaluationJobsResponse | EvaluationJob[]>(response)) {
        const { data } = response;
        return Array.isArray(data) ? data : data.items;
      }
      throw new Error('Invalid response format');
    });
  };

export const getEvaluationJob =
  (hostPath: string, namespace: string, jobId: string) =>
  (opts: APIOptions): Promise<EvaluationJob> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs/${encodeURIComponent(jobId)}`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<EvaluationJob>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const cancelEvaluationJob =
  (hostPath: string, namespace: string, jobId: string) =>
  (opts: APIOptions): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs/${encodeURIComponent(jobId)}`,
        {},
        { namespace },
        opts,
      ),
    ).then(() => undefined);

export const deleteEvaluationJob =
  (hostPath: string, namespace: string, jobId: string) =>
  (opts: APIOptions): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs/${encodeURIComponent(jobId)}`,
        {},
        // eslint-disable-next-line camelcase
        { namespace, hard_delete: 'true' },
        opts,
      ),
    ).then(() => undefined);

export const getCollections =
  (hostPath: string, params: ListCollectionsParams) =>
  (opts: APIOptions): Promise<CollectionsListResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.namespace) {
      queryParams.namespace = params.namespace;
    }
    if (params.limit != null) {
      queryParams.limit = String(params.limit);
    }
    if (params.offset != null) {
      queryParams.offset = String(params.offset);
    }
    if (params.name) {
      queryParams.name = params.name;
    }
    if (params.category) {
      queryParams.category = params.category;
    }
    if (params.tags && params.tags.length > 0) {
      queryParams.tags = params.tags.join(',');
    }
    if (params.scope) {
      queryParams.scope = params.scope;
    }
    return handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/collections`,
        queryParams,
        opts,
      ),
    ).then((response) => {
      if (
        isModArchResponse<
          | { items?: Collection[] | null; total_count?: number; limit?: number }
          | Collection[]
          | null
        >(response)
      ) {
        const { data } = response;
        if (!data) {
          return { items: [] };
        }
        if (Array.isArray(data)) {
          return { items: data };
        }
        return {
          items: data.items ?? [],
          // eslint-disable-next-line camelcase
          total_count: data.total_count,
          limit: data.limit,
        };
      }
      throw new Error('Invalid response format');
    });
  };

export const getProviders =
  (hostPath: string, namespace: string) =>
  (opts: APIOptions): Promise<Provider[]> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/providers`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<ProvidersResponse | Provider[]>(response)) {
        const { data } = response;
        return Array.isArray(data) ? data : data.items;
      }
      throw new Error('Invalid response format');
    });

export const createEvaluationJob =
  (hostPath: string, namespace: string, request: CreateEvaluationJobRequest) =>
  (opts: APIOptions): Promise<CreateEvaluationJobResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs`,
        request,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<CreateEvaluationJobResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
