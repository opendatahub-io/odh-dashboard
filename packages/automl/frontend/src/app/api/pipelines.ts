import {
  createPipelinesApi,
  type PipelineRunsData as SharedPipelineRunsData,
} from '@odh-dashboard/autox-core/ui/api';
import * as z from 'zod';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { BFF_API_VERSION, DEFAULT_PAGE_SIZE, URL_PREFIX } from '~/app/utilities/const';

export type { GetPipelineRunsFromBFFParams } from '@odh-dashboard/autox-core/ui/api';

/** Response shape from BFF pipeline-runs API. Exported for hooks/tables that need pagination. */
export type PipelineRunsData = SharedPipelineRunsData<ConfigureSchema>;

const createPipelineRunResponseSchema = z.object({
  /* eslint-disable camelcase */
  run_id: z.string(),
  display_name: z.string(),
  created_at: z.string(),
  state: z.enum(RuntimeStateKF).or(z.literal('')),
  experiment_id: z.string().optional(),
  storage_state: z.string().optional(),
  description: z.string().optional(),
  pipeline_version_id: z.string().optional(),
  service_account: z.string().optional(),
  scheduled_at: z.string().optional(),
  finished_at: z.string().optional(),
  /* eslint-enable camelcase */
});

/**
 * Pipeline-runs API surface for the AutoML BFF.
 * @see packages/automl/docs/pipeline-runs-api.md
 */
export const pipelinesApi = createPipelinesApi<ConfigureSchema>(
  URL_PREFIX,
  BFF_API_VERSION,
  DEFAULT_PAGE_SIZE,
);

export const { getPipelineRunsFromBFF, getPipelineRunFromBFF, enableManagedPipelines } =
  pipelinesApi;

export async function createPipelineRun(
  hostPath: string,
  namespace: string,
  payload: ConfigureSchema,
): Promise<PipelineRun> {
  const run = await pipelinesApi.createPipelineRun(hostPath, namespace, payload);
  createPipelineRunResponseSchema.parse(run);
  return run;
}
