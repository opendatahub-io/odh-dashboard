import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import * as z from 'zod';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

/**
 * Creates a new pipeline run via the AutoML BFF API.
 * @see packages/automl/docs/pipeline-runs-api.md
 */
export function useCreatePipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, ConfigureSchema, unknown> {
  return useMutation({
    mutationKey: ['automl', 'pipelineRun'],
    mutationFn: async (payload: ConfigureSchema) => {
      const response = await handleRestFailures(
        restCREATE<PipelineRun>(
          '',
          `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs?namespace=${namespace}`,
          payload,
        ),
      );
      if (isModArchResponse<PipelineRun>(response)) {
        return z
          .object({
            /* eslint-disable camelcase */
            run_id: z.string(),
            display_name: z.string(),
            created_at: z.string(),
            state: z.string(),
            experiment_id: z.string().optional(),
            storage_state: z.string().optional(),
            description: z.string().optional(),
            pipeline_version_id: z.string().optional(),
            service_account: z.string().optional(),
            scheduled_at: z.string().optional(),
            finished_at: z.string().optional(),
            /* eslint-enable camelcase */
          })
          .parse(response.data);
      }
      throw new Error('Invalid response format');
    },
  });
}
