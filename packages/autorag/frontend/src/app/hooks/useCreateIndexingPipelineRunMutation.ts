import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { createIndexingPipelineRun } from '~/app/api/pipelines';
import type { CreateIndexingPipelineRunRequest, PipelineRun } from '~/app/types';

export function useCreateIndexingPipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, CreateIndexingPipelineRunRequest, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'indexingPipelineRun', namespace],
    mutationFn: (payload) => createIndexingPipelineRun('', namespace, payload),
  });
}
