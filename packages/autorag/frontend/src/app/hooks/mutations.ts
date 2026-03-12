import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import type { PipelineRun } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export function usePipelineRunsMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, Record<string, unknown>, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'pipelineRun'],
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await handleRestFailures(
        restCREATE<PipelineRun>(
          '',
          `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs?namespace=${namespace}`,
          payload,
        ),
      );
      if (isModArchResponse<PipelineRun>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    },
  });
}
