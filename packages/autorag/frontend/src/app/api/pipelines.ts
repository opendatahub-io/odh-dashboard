import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import type { PipelineDefinition, PipelineRun } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

type PipelineRunsData = {
  runs?: PipelineRun[];
  total_size?: number;
  next_page_token?: string;
};

/** Default page size per pipeline-runs-api.md */
const DEFAULT_PAGE_SIZE = 20;

export type GetPipelineRunsFromBFFParams = {
  namespace: string;
  pipelineVersionId?: string;
  pageSize?: number;
  nextPageToken?: string;
};

/**
 * Fetches pipeline runs from the BFF API.
 * @see packages/autorag/docs/pipeline-runs-api.md
 */
export async function getPipelineRunsFromBFF(
  hostPath: string,
  params: GetPipelineRunsFromBFFParams,
  opts?: APIOptions,
): Promise<PipelineRun[]> {
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
  if (isModArchResponse<PipelineRunsData>(response)) {
    return response.data.runs ?? [];
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

export async function getPipelineRuns(hostPath: string, namespace: string): Promise<PipelineRun[]> {
  return getPipelineRunsFromBFF(hostPath, { namespace });
}
