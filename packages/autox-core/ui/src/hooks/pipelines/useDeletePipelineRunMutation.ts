import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAutoXApi } from '../../context';

export function useDeletePipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  const { pipelines: pipelinesApi } = useAutoXApi();
  return useMutation({
    mutationKey: ['deletePipelineRun', runId],
    mutationFn: () => pipelinesApi.deletePipelineRun(namespace, runId),
  });
}
