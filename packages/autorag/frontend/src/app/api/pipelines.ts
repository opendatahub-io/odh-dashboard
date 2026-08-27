/* eslint-disable camelcase -- BFF API uses snake_case for total_size, next_page_token */
import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restGET,
} from 'mod-arch-core';
import { createPipelinesApi } from '@odh-dashboard/autox-core/ui/api';
import { parseCreatePipelineRunResponse } from '~/app/hooks/useCreatePipelineRunMutation';
import type {
  CreateIndexingPipelineRunRequest,
  ManagedPipeline,
  PipelineDefinition,
  PipelineRun,
} from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type {
  PipelineRunsData,
  GetPipelineRunsFromBFFParams,
} from '@odh-dashboard/autox-core/ui/api';

/**
 * Pipeline-runs API surface for the AutoRAG BFF.
 * @see packages/autorag/docs/pipeline-runs-api.md
 */
export const pipelinesApi = createPipelinesApi(URL_PREFIX, BFF_API_VERSION);

export const { getPipelineRunsFromBFF, getPipelineRunFromBFF, enableManagedPipelines } =
  pipelinesApi;

export async function getManagedPipelines(
  hostPath: string,
  namespace: string,
  opts?: APIOptions,
): Promise<ManagedPipeline[]> {
  if (!namespace) {
    return [];
  }

  const response = await handleRestFailures(
    restGET(
      hostPath,
      `${URL_PREFIX}/api/${BFF_API_VERSION}/managed-pipelines`,
      { namespace },
      opts ?? {},
    ),
  );
  if (isModArchResponse<{ pipelines?: ManagedPipeline[] }>(response)) {
    return response.data.pipelines ?? [];
  }
  throw new Error('Invalid response format');
}

export async function createIndexingPipelineRun(
  hostPath: string,
  namespace: string,
  payload: CreateIndexingPipelineRunRequest,
): Promise<PipelineRun> {
  const response = await handleRestFailures(
    restCREATE<PipelineRun>(
      hostPath,
      `${URL_PREFIX}/api/${BFF_API_VERSION}/indexing-pipeline-runs?namespace=${encodeURIComponent(namespace)}`,
      payload,
    ),
  );
  if (isModArchResponse<PipelineRun>(response)) {
    return parseCreatePipelineRunResponse(response.data);
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
  // Prefer managed-pipelines discovery for runtime pipeline availability.
  // Legacy callers expecting PipelineDefinition[] still get an empty list.
  return [];
}
