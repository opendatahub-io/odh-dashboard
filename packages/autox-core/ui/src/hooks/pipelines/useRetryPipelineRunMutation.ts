import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAutoXApi } from '../../context';

export function useRetryPipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  const { pipelines: pipelinesApi } = useAutoXApi();
  return useMutation({
    mutationKey: ['retryPipelineRun', runId],
    mutationFn: () => pipelinesApi.retryPipelineRun(namespace, runId),
  });
}
