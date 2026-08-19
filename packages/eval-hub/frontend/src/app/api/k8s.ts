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
  CollectionBenchmark,
  CollectionsListResponse,
  EvalHubCRStatus,
  EvalHubHealthResponse,
  CreateEvaluationJobRequest,
  CreateEvaluationJobResponse,
  EvaluationJob,
  EvaluationJobsResponse,
  InferenceServicesResponse,
  ListCollectionsParams,
  ListEvaluationJobsParams,
  NamespaceKind,
  Provider,
  ProviderBenchmark,
  ProvidersResponse,
  VerifyConnectionRequest,
  VerifyConnectionResponse,
} from '~/app/types';
import { CatalogSecurityArtifactList } from '~/app/pages/modelCatalog/securityInsightsTypes';

const validateEvaluationJob = (data: unknown): void => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid evaluation job: missing results');
  }
  if (!('results' in data) || !data.results || typeof data.results !== 'object') {
    throw new Error('Invalid evaluation job: missing results');
  }
  if (
    'benchmarks' in data.results &&
    data.results.benchmarks != null &&
    !Array.isArray(data.results.benchmarks)
  ) {
    throw new Error('Invalid evaluation job: results.benchmarks is not an array');
  }
};

const isString = (v: unknown): v is string => typeof v === 'string';

const isValidProviderItem = (p: unknown): p is Provider =>
  p != null &&
  typeof p === 'object' &&
  'resource' in p &&
  p.resource != null &&
  typeof p.resource === 'object' &&
  'id' in p.resource &&
  typeof p.resource.id === 'string' &&
  'name' in p &&
  typeof p.name === 'string';

const isValidProviderBenchmark = (b: unknown): b is ProviderBenchmark =>
  b != null &&
  typeof b === 'object' &&
  'id' in b &&
  typeof b.id === 'string' &&
  'name' in b &&
  typeof b.name === 'string';

const isValidCollectionItem = (c: unknown): c is Collection =>
  c != null &&
  typeof c === 'object' &&
  'resource' in c &&
  c.resource != null &&
  typeof c.resource === 'object' &&
  'id' in c.resource &&
  typeof c.resource.id === 'string' &&
  'name' in c &&
  typeof c.name === 'string';

const isValidCollectionBenchmark = (b: unknown): b is CollectionBenchmark =>
  b != null && typeof b === 'object' && 'id' in b && typeof b.id === 'string';

const sanitizeProviders = (items: unknown[]): Provider[] =>
  items.filter(isValidProviderItem).map((p) => ({
    ...p,
    benchmarks: Array.isArray(p.benchmarks)
      ? p.benchmarks.filter(isValidProviderBenchmark).map((b) => ({
          ...b,
          metrics: Array.isArray(b.metrics) ? b.metrics.filter(isString) : undefined,
        }))
      : undefined,
  }));

const sanitizeCollectionItems = (items: unknown[]): Collection[] =>
  items.filter(isValidCollectionItem).map((c) => ({
    ...c,
    benchmarks: Array.isArray(c.benchmarks)
      ? c.benchmarks.filter(isValidCollectionBenchmark)
      : undefined,
  }));

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
  (hostPath: string, namespace?: string) =>
  (opts: APIOptions): Promise<EvalHubHealthResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evalhub/health`,
        namespace ? { namespace } : {},
        opts,
      ),
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
        const { data } = response;
        validateEvaluationJob(data);
        return data;
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
          return { items: sanitizeCollectionItems(data) };
        }
        return {
          items: sanitizeCollectionItems(data.items ?? []),
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
        return sanitizeProviders(Array.isArray(data) ? data : data.items);
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

export const getInferenceServices =
  (hostPath: string, namespace: string) =>
  (opts: APIOptions): Promise<InferenceServicesResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/inferenceservices`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<InferenceServicesResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getCatalogSecurityArtifacts =
  (hostPath: string, sourceId: string, modelName: string, namespace?: string, pageSize?: number) =>
  (opts: APIOptions): Promise<CatalogSecurityArtifactList> => {
    const queryParams: Record<string, string> = {};
    if (namespace) {
      queryParams.namespace = namespace;
    }
    if (pageSize != null) {
      queryParams.pageSize = String(pageSize);
    }

    return handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/catalog/sources/${encodeURIComponent(sourceId)}/security_artifacts/${encodeURIComponent(modelName)}`,
        queryParams,
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<CatalogSecurityArtifactList>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };

export class LogFetchError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'LogFetchError';
  }
}

export const isLogApiUnavailable = (error: Error): boolean =>
  error instanceof LogFetchError && error.statusCode === 404;

export const isLogServerError = (error: Error): boolean =>
  error instanceof LogFetchError && error.statusCode >= 500;

export const getEvaluationJobLogs =
  (
    hostPath: string,
    namespace: string,
    jobId: string,
    params?: { tail_lines?: number; timestamps?: boolean; since_seconds?: number },
  ) =>
  async (signal?: AbortSignal): Promise<string> => {
    const queryParams = new URLSearchParams({ namespace });
    if (params?.tail_lines != null) {
      queryParams.set('tail_lines', String(params.tail_lines));
    }
    if (params?.timestamps != null) {
      queryParams.set('timestamps', String(params.timestamps));
    }
    if (params?.since_seconds != null) {
      queryParams.set('since_seconds', String(params.since_seconds));
    }
    const url = `${hostPath}${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs/${encodeURIComponent(jobId)}/logs?${queryParams.toString()}`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new LogFetchError(
        response.status,
        `Failed to fetch logs: ${response.status} ${response.statusText}`,
      );
    }
    const contentType = response.headers.get('Content-Type')?.split(';')[0].trim();
    if (contentType !== 'text/plain') {
      throw new LogFetchError(
        response.status,
        `Unexpected Content-Type: ${contentType ?? 'missing'}`,
      );
    }
    return response.text();
  };

export const getEvaluationJobBenchmarkLogs =
  (
    hostPath: string,
    namespace: string,
    jobId: string,
    benchmarkIndex: number,
    params?: { tail_lines?: number; timestamps?: boolean; since_seconds?: number },
  ) =>
  async (signal?: AbortSignal): Promise<string> => {
    const queryParams = new URLSearchParams({ namespace });
    if (params?.tail_lines != null) {
      queryParams.set('tail_lines', String(params.tail_lines));
    }
    if (params?.timestamps != null) {
      queryParams.set('timestamps', String(params.timestamps));
    }
    if (params?.since_seconds != null) {
      queryParams.set('since_seconds', String(params.since_seconds));
    }
    const url = `${hostPath}${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/jobs/${encodeURIComponent(jobId)}/benchmarks/${benchmarkIndex}/logs?${queryParams.toString()}`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new LogFetchError(
        response.status,
        `Failed to fetch benchmark logs: ${response.status} ${response.statusText}`,
      );
    }
    const contentType = response.headers.get('Content-Type')?.split(';')[0].trim();
    if (contentType !== 'text/plain') {
      throw new LogFetchError(
        response.status,
        `Unexpected Content-Type: ${contentType ?? 'missing'}`,
      );
    }
    return response.text();
  };

export const verifyConnection =
  (hostPath: string, namespace: string, request: VerifyConnectionRequest) =>
  (opts: APIOptions): Promise<VerifyConnectionResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/verify-connection`,
        request,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<VerifyConnectionResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
