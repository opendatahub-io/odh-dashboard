import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import * as z from 'zod';
import {
  createPipelineRunMutations,
  createUseS3FileUploadMutation,
  type S3FileUploadMutationVariables,
} from '@odh-dashboard/autox-core/ui/hooks';
import { uploadFileToS3 } from '~/app/api/s3';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type { S3FileUploadMutationVariables };

export const useS3FileUploadMutation = createUseS3FileUploadMutation(uploadFileToS3);

export const {
  useTerminatePipelineRunMutation,
  useRetryPipelineRunMutation,
  useDeletePipelineRunMutation,
} = createPipelineRunMutations(URL_PREFIX, BFF_API_VERSION);

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
            state: z.enum(RuntimeStateKF).or(z.literal('')),
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
