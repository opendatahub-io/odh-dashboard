import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAutoXApi } from '../../context';

export function useTerminatePipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  const { pipelines: pipelinesApi } = useAutoXApi();
  return useMutation({
    mutationKey: ['terminatePipelineRun', runId],
    mutationFn: () => pipelinesApi.terminatePipelineRun(namespace, runId),
  });
}
