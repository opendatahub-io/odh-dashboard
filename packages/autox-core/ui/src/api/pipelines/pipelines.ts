/* eslint-disable camelcase -- BFF API uses snake_case for total_size, next_page_token */
import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restGET,
} from 'mod-arch-core';
import type { GetPipelineRunsFromBFFParams, PipelineRun, PipelineRunsData } from './types';

type PipelineRunsApiResponse<TParams> = {
  runs?: PipelineRun<TParams>[];
  total_size?: number;
  next_page_token?: string;
};

export type PipelinesApi<TParams = Record<string, unknown>> = {
  getPipelineRunsFromBFF: (
    hostPath: string,
    params: GetPipelineRunsFromBFFParams,
    opts?: APIOptions,
  ) => Promise<PipelineRunsData<TParams>>;
  getPipelineRunFromBFF: (
    hostPath: string,
    runId: string,
    namespace: string,
    opts?: APIOptions,
  ) => Promise<PipelineRun<TParams>>;
  enableManagedPipelines: (hostPath: string, namespace: string) => Promise<void>;
};

/**
 * Creates the shared pipeline-runs API surface for a given product's BFF URL
 * prefix/API version.
 *
 * Generic over `TParams`, the type of a pipeline run's `runtime_config.parameters`
 * — instantiate with a product-specific parameters schema (e.g.
 * `createPipelinesApi<ConfigureSchema>(...)`) where that distinction matters, or
 * leave the default for callers that only need the untyped shape.
 */
export function createPipelinesApi<TParams = Record<string, unknown>>(
  urlPrefix: string,
  bffApiVersion: string,
  defaultPageSize = 20,
): PipelinesApi<TParams> {
  /**
   * Fetches pipeline runs from the BFF API.
   * Returns full pagination data for server-side pagination support.
   */
  async function getPipelineRunsFromBFF(
    hostPath: string,
    params: GetPipelineRunsFromBFFParams,
    opts?: APIOptions,
  ): Promise<PipelineRunsData<TParams>> {
    const queryParams: Record<string, string> = {
      namespace: params.namespace,
      pageSize: String(params.pageSize ?? defaultPageSize),
    };
    if (params.pipelineVersionId) {
      queryParams.pipelineVersionId = params.pipelineVersionId;
    }
    if (params.page != null) {
      queryParams.page = String(params.page);
    }

    const response = await handleRestFailures(
      restGET(hostPath, `${urlPrefix}/api/${bffApiVersion}/pipeline-runs`, queryParams, opts ?? {}),
    );
    if (isModArchResponse<PipelineRunsApiResponse<TParams>>(response)) {
      const { data } = response;
      return {
        runs: data.runs ?? [],
        total_size: data.total_size ?? 0,
        next_page_token: data.next_page_token ?? '',
      };
    }
    throw new Error('Invalid response format');
  }

  async function getPipelineRunFromBFF(
    hostPath: string,
    runId: string,
    namespace: string,
    opts?: APIOptions,
  ): Promise<PipelineRun<TParams>> {
    const queryParams: Record<string, string> = { namespace };

    const response = await handleRestFailures(
      restGET(
        hostPath,
        `${urlPrefix}/api/${bffApiVersion}/pipeline-runs/${encodeURIComponent(runId)}`,
        queryParams,
        opts ?? {},
      ),
    );
    if (isModArchResponse<PipelineRun<TParams>>(response)) {
      return response.data;
    }
    throw new Error('Invalid response format');
  }

  async function enableManagedPipelines(hostPath: string, namespace: string): Promise<void> {
    await handleRestFailures(
      restCREATE(
        hostPath,
        `${urlPrefix}/api/${bffApiVersion}/managed-pipelines/enable?namespace=${encodeURIComponent(
          namespace,
        )}`,
        {},
      ),
    );
  }

  return { getPipelineRunsFromBFF, getPipelineRunFromBFF, enableManagedPipelines };
}
