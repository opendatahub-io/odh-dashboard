import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { pipelineServerReadinessKey } from './usePipelineServerReadinessQuery';
import { useAutoXApi } from '../../context/AutoXApiContext';

export function useEnableManagedPipelinesMutation(): UseMutationResult<void, Error, string> {
  const { pipelines: pipelinesApi } = useAutoXApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (namespace: string) => pipelinesApi.enableManagedPipelines('', namespace),
    onSuccess: (_data, namespace) =>
      queryClient.invalidateQueries({ queryKey: pipelineServerReadinessKey(namespace) }),
  });
}
