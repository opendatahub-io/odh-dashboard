import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { S3ListObjectsResponse } from '../../api/s3/types';
import { useAutoXApi } from '../../context/AutoXApiContext';

/**
 * Structural slice of the query React Query passes to the function form of
 * `refetchInterval`. Includes `status` because a failed refetch retains the
 * query's previous data while flipping the status to 'error' — a callback
 * that inspects only `data` cannot distinguish that state.
 */
export type S3ListRefetchIntervalQuery = {
  state: { data?: S3ListObjectsResponse; status: 'pending' | 'error' | 'success' };
};

/**
 * Optional `refetchInterval` passthrough for dependent-discovery callers
 * (e.g. useTaskExecutorError's bounded rediscovery). The function form
 * receives the query, so the interval can be computed from the query's own
 * latest state and turned off when its stage of the discovery resolves.
 */
export type S3ListQueryOptions = {
  refetchInterval?: number | false | ((query: S3ListRefetchIntervalQuery) => number | false);
};

/**
 * Lists S3 files using the injected API client.
 */
export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
  options: S3ListQueryOptions = {},
): UseQueryResult<S3ListObjectsResponse, Error> {
  const { s3: s3Api } = useAutoXApi();

  return useQuery<S3ListObjectsResponse, Error>({
    queryKey: ['s3Files', namespace, path],
    queryFn: async ({ signal }) => {
      if (!namespace || !path) {
        throw new Error('namespace and path are required');
      }
      return s3Api.getFiles('', { signal }, { namespace, path });
    },
    enabled: Boolean(namespace && path),
    retry: false,
    refetchInterval: options.refetchInterval,
  });
}

export function useS3ListFilesQueries(
  namespace: string | undefined,
  paths: string[],
  options: S3ListQueryOptions = {},
): UseQueryResult<S3ListObjectsResponse, Error>[] {
  const { s3: s3Api } = useAutoXApi();
  return useQueries({
    queries: paths.map((path) => ({
      queryKey: ['s3Files', namespace, path],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        s3Api.getFiles('', { signal }, { namespace: namespace ?? '', path }),
      enabled: Boolean(namespace && path),
      retry: false,
      refetchInterval: options.refetchInterval,
    })),
  });
}
