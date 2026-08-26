import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useProductContext } from '../../context';

export function useDeletePipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  const {
    api: { pipelines: pipelinesApi },
  } = useProductContext();
  return useMutation({
    mutationKey: ['deletePipelineRun', runId],
    mutationFn: () => pipelinesApi.deletePipelineRun(namespace, runId),
  });
}
