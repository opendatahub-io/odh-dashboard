/* eslint-disable camelcase -- BFF API uses snake_case for total_size, next_page_token */
import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import type { PipelineRun } from '~/app/types';
import { BFF_API_VERSION, DEFAULT_PAGE_SIZE, URL_PREFIX } from '~/app/utilities/const';

/** Response shape from BFF pipeline-runs API. Exported for hooks/tables that need pagination. */
export type PipelineRunsData = {
  runs: PipelineRun[];
  total_size: number;
  next_page_token: string;
};

export type GetPipelineRunsFromBFFParams = {
  namespace: string;
  pipelineVersionId?: string;
  pageSize?: number;
  nextPageToken?: string;
};

type PipelineRunsApiResponse = {
  runs?: PipelineRun[];
  total_size?: number;
  next_page_token?: string;
};

/**
 * Fetches pipeline runs from the AutoML BFF API.
 * Returns full pagination data for server-side pagination support.
 * @see packages/automl/docs/pipeline-runs-api.md
 */
export async function getPipelineRunsFromBFF(
  hostPath: string,
  params: GetPipelineRunsFromBFFParams,
  opts?: APIOptions,
): Promise<PipelineRunsData> {
  const queryParams: Record<string, string> = {
    namespace: params.namespace,
    pageSize: String(params.pageSize ?? DEFAULT_PAGE_SIZE),
  };
  if (params.pipelineVersionId) {
    queryParams.pipelineVersionId = params.pipelineVersionId;
  }
  if (params.nextPageToken) {
    queryParams.nextPageToken = params.nextPageToken;
  }

  const response = await handleRestFailures(
    restGET(
      hostPath,
      `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs`,
      queryParams,
      opts ?? {},
    ),
  );
  if (isModArchResponse<PipelineRunsApiResponse>(response)) {
    const { data } = response;
    return {
      runs: data.runs ?? [],
      total_size: data.total_size ?? 0,
      next_page_token: data.next_page_token ?? '',
    };
  }
  throw new Error('Invalid response format');
}

export async function getPipelineRunFromBFF(
  hostPath: string,
  runId: string,
  namespace: string,
  opts?: APIOptions,
): Promise<PipelineRun> {
  const queryParams: Record<string, string> = { namespace };

  const response = await handleRestFailures(
    restGET(
      hostPath,
      `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs/${encodeURIComponent(runId)}`,
      queryParams,
      opts ?? {},
    ),
  );
  if (isModArchResponse<PipelineRun>(response)) {
    return response.data;
  }
  throw new Error('Invalid response format');
}
