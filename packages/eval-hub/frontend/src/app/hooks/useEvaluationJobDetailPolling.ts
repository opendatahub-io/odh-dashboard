import React from 'react';
import { useQueries, type QueryStatus } from '@tanstack/react-query';
import { getEvaluationJob } from '~/app/api/k8s';
import { EvaluationJob } from '~/app/types';
import { isTerminalState } from '~/app/utilities/evaluationUtils';
import {
  DETAIL_POLL_INTERVAL_MS,
  RETRY_DELAY_MS,
  MAX_RETRY_ATTEMPTS,
  createRequestPool,
} from '~/app/utilities/evaluationJobPolling';

const parseErrorStatus = (error: Error): number | undefined => {
  const match = error.message.match(/\b([45]\d{2})\b/);
  return match ? Number(match[1]) : undefined;
};

type DetailPollingResult = {
  polledJobDataMap: Map<string, EvaluationJob>;
  isWarning: boolean;
};

const useEvaluationJobDetailPolling = (
  jobIds: string[],
  namespace: string | undefined,
  enabled: boolean,
): DetailPollingResult => {
  const poolRef = React.useRef(createRequestPool());

  return useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: ['evalJobDetail', namespace, jobId],
      // Route each fetch through the request pool so at most 5 run concurrently
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        poolRef.current.enqueue(
          () => getEvaluationJob('', namespace ?? '', jobId)({ signal }),
          signal,
        ),
      enabled: enabled && !!namespace,
      // Each poll returns a new object so elapsed time recomputes even if job data is unchanged
      structuralSharing: false,
      // Keep showing the last successful data while a refetch or retry is in progress
      placeholderData: (previousData: EvaluationJob | undefined) => previousData,
      // Skip retry for 4xx (client errors won't self-resolve); retry 5xx/network up to 5 times
      retry: (failureCount: number, error: Error) => {
        const status = parseErrorStatus(error);
        if (status && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < MAX_RETRY_ATTEMPTS;
      },
      // Exponential backoff (5s, 10s, 20s, 40s, 80s) with random jitter to spread retries
      retryDelay: (attempt: number) => {
        const exp = RETRY_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * RETRY_DELAY_MS);
        return exp + jitter;
      },
      // Poll every 10s; resume at a slow cadence after errors so polling recovers when the server comes back
      refetchInterval: (query: { state: { status: QueryStatus; data?: EvaluationJob } }) => {
        if (query.state.status === 'error') {
          return DETAIL_POLL_INTERVAL_MS * 6; // 60s recovery cadence
        }
        const state = query.state.data?.status.state;
        if (state && isTerminalState(state)) {
          return false;
        }
        return DETAIL_POLL_INTERVAL_MS;
      },
    })),
    combine: (results) => {
      const polledJobDataMap = new Map<string, EvaluationJob>();
      results.forEach((result, index) => {
        if (result.data) {
          polledJobDataMap.set(jobIds[index], result.data);
        }
      });
      return {
        polledJobDataMap,
        isWarning: results.some((r) => r.status === 'error'),
      };
    },
  });
};

export default useEvaluationJobDetailPolling;
