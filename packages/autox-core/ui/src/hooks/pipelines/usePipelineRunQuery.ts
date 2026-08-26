import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { PipelineRun, PipelinesApi } from '../../api/pipelines';

const POLL_INTERVAL_MS = 10000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRY_ATTEMPTS = 5;

export type PipelineRunQueryDeps<TParams> = {
  /** Returns true when a run's state is terminal (won't change without external action). */
  isRunInTerminalState: (state: unknown) => boolean;
  /** Extracts an HTTP-like status code from an Error's message, if present. */
  parseErrorStatus: (error: Error) => number | undefined;
  /**
   * Optional post-fetch normalization applied to every fetched run before it's
   * cached/returned (e.g. AutoRAG's `normalizePipelineRun`, which rewrites legacy
   * parameter keys). Runs through the query's `queryFn` so it's applied once per
   * fetch rather than by every consumer of the cached data.
   */
  normalize?: (run: PipelineRun<TParams>) => PipelineRun<TParams>;
};

/**
 * Creates a `usePipelineRunQuery` hook bound to a product's own
 * `getPipelineRunFromBFF` API function (as returned by `createPipelinesApi`).
 */
export function createUsePipelineRunQuery<TParams = Record<string, unknown>>(
  getPipelineRunFromBFF: PipelinesApi<TParams>['getPipelineRunFromBFF'],
  deps: PipelineRunQueryDeps<TParams>,
): (runId?: string, namespace?: string) => UseQueryResult<PipelineRun<TParams>, Error> {
  const { isRunInTerminalState, parseErrorStatus, normalize } = deps;

  return function usePipelineRunQuery(
    runId?: string,
    namespace?: string,
  ): UseQueryResult<PipelineRun<TParams>, Error> {
    return useQuery({
      queryKey: ['pipelineRun', runId, namespace],
      queryFn: async ({ signal }) => {
        const run = await getPipelineRunFromBFF('', runId!, namespace!, { signal });
        return normalize ? normalize(run) : run;
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
  };
}
