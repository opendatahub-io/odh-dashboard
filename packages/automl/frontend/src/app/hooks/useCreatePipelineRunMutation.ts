import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { createPipelineRun } from '~/app/api/pipelines';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';

export function useCreatePipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, ConfigureSchema, unknown> {
  return useMutation({
    mutationKey: ['automl', 'pipelineRun'],
    mutationFn: (payload: ConfigureSchema) => createPipelineRun('', namespace, payload),
  });
}
