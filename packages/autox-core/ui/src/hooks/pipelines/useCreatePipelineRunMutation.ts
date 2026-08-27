import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type { PipelineRun } from '../../api/pipelines';
import { useAutoXApi } from '../../context';

export function useCreatePipelineRunMutation<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  TData = PipelineRun<TVariables>,
>(
  namespace: string,
  select?: (run: PipelineRun<TVariables>) => TData,
): UseMutationResult<TData, Error, TVariables | FormData, unknown> {
  const { pipelines: pipelinesApi } = useAutoXApi();

  return useMutation<TData, Error, TVariables | FormData, unknown>({
    mutationKey: ['createPipelineRun', namespace],
    mutationFn: async (payload) => {
      const run = await pipelinesApi.createPipelineRun('', namespace, payload);
      // The caller supplies the product-specific run parameter type.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const typedRun = run as PipelineRun<TVariables>;
      // The caller can retain product-specific response validation and typing.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return select ? select(typedRun) : (typedRun as unknown as TData);
    },
  });
}
