import { useMutation, UseMutationResult } from '@tanstack/react-query';
import {
  useTerminatePipelineRunMutation,
  useRetryPipelineRunMutation,
  useDeletePipelineRunMutation,
  useS3FileUploadMutation,
  type S3FileUploadMutationVariables,
} from '@odh-dashboard/autox-core/ui/hooks';
import { createPipelineRun } from '~/app/api/pipelines';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';

export type { S3FileUploadMutationVariables };

export {
  useS3FileUploadMutation,
  useTerminatePipelineRunMutation,
  useRetryPipelineRunMutation,
  useDeletePipelineRunMutation,
};

/**
 * Creates a new pipeline run via the AutoML BFF API.
 * @see packages/automl/docs/pipeline-runs-api.md
 */
export function useCreatePipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, ConfigureSchema, unknown> {
  return useMutation({
    mutationKey: ['automl', 'pipelineRun'],
    mutationFn: (payload: ConfigureSchema) => createPipelineRun('', namespace, payload),
  });
}
