import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useProductContext } from '../../context';

export function useRetryPipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  const {
    api: { pipelines: pipelinesApi },
  } = useProductContext();
  return useMutation({
    mutationKey: ['retryPipelineRun', runId],
    mutationFn: () => pipelinesApi.retryPipelineRun(namespace, runId),
  });
}
