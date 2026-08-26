import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useProductContext } from '../../context';

export type PipelineRunMutations = {
  useTerminatePipelineRunMutation: (
    namespace: string,
    runId: string,
  ) => UseMutationResult<void, Error, void, unknown>;
  useRetryPipelineRunMutation: (
    namespace: string,
    runId: string,
  ) => UseMutationResult<void, Error, void, unknown>;
  useDeletePipelineRunMutation: (
    namespace: string,
    runId: string,
  ) => UseMutationResult<void, Error, void, unknown>;
};

/**
 * Provides shared pipeline-run mutations using ProductContext's API client.
 */
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
