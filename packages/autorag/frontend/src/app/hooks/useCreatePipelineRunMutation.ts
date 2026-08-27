import { useCreatePipelineRunMutation as useCoreCreatePipelineRunMutation } from '@odh-dashboard/autox-core/ui/hooks';
import * as z from 'zod';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';

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

export function parseCreatePipelineRunResponse(run: PipelineRun): PipelineRun {
  createPipelineRunResponseSchema.parse(run);
  return run;
}

export function useCreatePipelineRunMutation(
  namespace: string,
): ReturnType<typeof useCoreCreatePipelineRunMutation<ConfigureSchema, PipelineRun>> {
  return useCoreCreatePipelineRunMutation<ConfigureSchema, PipelineRun>(
    namespace,
    parseCreatePipelineRunResponse,
  );
}
