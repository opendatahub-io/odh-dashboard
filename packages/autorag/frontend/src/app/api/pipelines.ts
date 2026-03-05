/* eslint-disable camelcase -- BFF API uses snake_case for total_size, next_page_token */
import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import type { PipelineDefinition, PipelineRun } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

/** Response shape from BFF pipeline-runs API. Exported for hooks/tables that need pagination. */
export type PipelineRunsData = {
  runs: PipelineRun[];
  total_size: number;
  next_page_token: string;
};

/** Default page size per pipeline-runs-api.md */
const DEFAULT_PAGE_SIZE = 20;

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
 * Fetches pipeline runs from the BFF API.
 * Returns full pagination data for server-side pagination support.
 * @see packages/autorag/docs/pipeline-runs-api.md
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

export async function getPipelineDefinitions(
  _hostPath: string,
  namespace: string,
): Promise<PipelineDefinition[]> {
  if (!namespace) {
    return [];
  }
  // BFF pipeline-definitions endpoint not yet implemented; return empty
  return [];
}
