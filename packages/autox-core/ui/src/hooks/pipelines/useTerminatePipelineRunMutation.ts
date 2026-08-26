import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useProductContext } from '../../context';

export function useTerminatePipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  const {
    api: { pipelines: pipelinesApi },
  } = useProductContext();
  return useMutation({
    mutationKey: ['terminatePipelineRun', runId],
    mutationFn: () => pipelinesApi.terminatePipelineRun(namespace, runId),
  });
}
