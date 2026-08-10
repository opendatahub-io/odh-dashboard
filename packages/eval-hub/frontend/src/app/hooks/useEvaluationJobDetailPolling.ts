import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { getEvaluationJob } from '~/app/api/k8s';
import { EvaluationJob } from '~/app/types';
import { isTerminalState } from '~/app/utilities/evaluationUtils';
import {
  DETAIL_POLL_INTERVAL_MS,
  RETRY_DELAY_MS,
  MAX_RETRY_ATTEMPTS,
  createRequestPool,
} from '~/app/utilities/detailPolling';

const parseErrorStatus = (error: Error): number | undefined => {
  const match = error.message.match(/\b(\d{3})\b/);
  return match ? Number(match[1]) : undefined;
};

type DetailPollingResult = {
  detailDataMap: Map<string, EvaluationJob>;
  isWarning: boolean;
};

const useEvaluationJobDetailPolling = (
  jobIds: string[],
  namespace: string | undefined,
  enabled: boolean,
): DetailPollingResult => {
  const poolRef = React.useRef(createRequestPool());

  const queries = useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: ['evalJobDetail', namespace, jobId],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        poolRef.current.enqueue(() => getEvaluationJob('', namespace ?? '', jobId)({ signal })),
      enabled: enabled && !!namespace,
      placeholderData: (previousData: EvaluationJob | undefined) => previousData,
      retry: (failureCount: number, error: Error) => {
        const status = parseErrorStatus(error);
        if (status && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < MAX_RETRY_ATTEMPTS;
      },
      retryDelay: (attempt: number) => {
        const exp = RETRY_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * RETRY_DELAY_MS);
        return exp + jitter;
      },
      refetchInterval: (query: { state: { status: string; data?: EvaluationJob } }) => {
        if (query.state.status === 'error') {
          return false;
        }
        const state = query.state.data?.status.state;
        if (state && isTerminalState(state)) {
          return false;
        }
        return DETAIL_POLL_INTERVAL_MS;
      },
    })),
  });

  const detailDataMap = React.useMemo(() => {
    const map = new Map<string, EvaluationJob>();
    queries.forEach((query, index) => {
      if (query.data) {
        map.set(jobIds[index], query.data);
      }
    });
    return map;
  }, [queries, jobIds]);

  const isWarning = queries.some((query) => query.status === 'error');

  return { detailDataMap, isWarning };
};

export default useEvaluationJobDetailPolling;
