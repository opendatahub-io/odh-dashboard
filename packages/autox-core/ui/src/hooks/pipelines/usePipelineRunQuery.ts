import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { PipelineRun } from '../../api/pipelines';
import { useProductContext } from '../../context';

const POLL_INTERVAL_MS = 10000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Fetches one pipeline run using the API client configured by ProductContext.
 */
export function usePipelineRunQuery<TParams = Record<string, unknown>>(
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun<TParams>, Error> {
  const {
    api: { pipelines: pipelinesApi },
    isRunInTerminalState,
    parseErrorStatus,
    normalize,
  } = useProductContext();

  return useQuery({
    queryKey: ['pipelineRun', runId, namespace],
    queryFn: async ({ signal }) => {
      const run = await pipelinesApi.getPipelineRunFromBFF('', runId!, namespace!, { signal });
      const normalized = normalize ? normalize(run) : run;
      // ProductContext owns the runtime client; the caller supplies the run parameter type.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return normalized as PipelineRun<TParams>;
    },
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
