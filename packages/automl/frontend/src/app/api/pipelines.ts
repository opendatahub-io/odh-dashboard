import {
  createPipelinesApi,
  type PipelineRunsData as SharedPipelineRunsData,
} from '@odh-dashboard/autox-core/ui/api';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type { GetPipelineRunsFromBFFParams } from '@odh-dashboard/autox-core/ui/api';

/** Response shape from BFF pipeline-runs API. Exported for hooks/tables that need pagination. */
export type PipelineRunsData = SharedPipelineRunsData<ConfigureSchema>;

/**
 * Pipeline-runs API surface for the AutoML BFF.
 * @see packages/automl/docs/pipeline-runs-api.md
 */
export const pipelinesApi = createPipelinesApi<ConfigureSchema>(URL_PREFIX, BFF_API_VERSION);

export const { getPipelineRunsFromBFF, getPipelineRunFromBFF, enableManagedPipelines } =
  pipelinesApi;
