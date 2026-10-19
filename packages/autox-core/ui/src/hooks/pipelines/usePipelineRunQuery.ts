import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import type { PipelineRun } from '../../api/pipelines/types';
import { isRunInTerminalState } from '../../api/pipelines/kfTypes';
import { useAutoXApi } from '../../context/AutoXApiContext';
import { parseErrorStatus } from '../../utils/parseErrorStatus';

const POLL_INTERVAL_MS = 10000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Fetches one pipeline run using the injected API client.
 */
export function usePipelineRunQuery<
  TParams = Record<string, unknown>,
  TData = PipelineRun<TParams>,
>(
  runId?: string,
  namespace?: string,
  select?: (run: PipelineRun<TParams>) => TData,
): UseQueryResult<TData, Error> {
  const { pipelines: pipelinesApi } = useAutoXApi();

  return useQuery<PipelineRun<TParams>, Error, TData>({
    queryKey: ['pipelineRun', runId, namespace],
    queryFn: async ({ signal }) => {
      const run = await pipelinesApi.getPipelineRunFromBFF('', runId!, namespace!, { signal });
      // The caller supplies the product-specific run parameter type.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return run as PipelineRun<TParams>;
    },
    select,
    enabled: !!runId && !!namespace,
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      const status = parseErrorStatus(error);
      if (status && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < MAX_RETRY_ATTEMPTS;
    },
    // Exponential backoff (5s, 10s, 20s, 40s, 80s) with random jitter to avoid thundering herd
    retryDelay: (attempt) => {
      const exp = RETRY_DELAY_MS * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * RETRY_DELAY_MS);
      return exp + jitter;
    },
    refetchInterval: (query) => {
      // Let the retry backoff handle re-fetching during errors
      if (query.state.status === 'error') {
        return false;
      }
      const state = query.state.data?.state;
      if (!state || isRunInTerminalState(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}

export function usePipelineRunCacheActions(): {
  invalidatePipelineRun: (runId: string, namespace: string) => Promise<void>;
} {
  const queryClient = useQueryClient();

  return React.useMemo(
    () => ({
      invalidatePipelineRun: (runId: string, namespace: string) =>
        queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] }),
    }),
    [queryClient],
  );
}
