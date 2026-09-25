import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import type { S3ListObjectsResponse } from '../../api/s3';
import { useAutoXApi } from '../../context';

/**
 * Lists S3 files using the injected API client.
 */
export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
): UseQueryResult<S3ListObjectsResponse, Error> {
  const { s3: s3Api } = useAutoXApi();

  return useQuery(createS3ListFilesQueryOptions(s3Api, namespace, path));
}

export function createS3ListFilesQueryOptions(
  s3Api: ReturnType<typeof useAutoXApi>['s3'],
  namespace?: string,
  path?: string,
): UseQueryOptions<S3ListObjectsResponse, Error> {
  return {
    queryKey: ['s3Files', namespace, path],
    queryFn: async ({ signal }) => {
      if (!namespace || !path) {
        throw new Error('namespace and path are required');
      }
      return s3Api.getFiles(
        '',
        { signal },
        {
          namespace,
          path,
        },
      );
    },
    enabled: Boolean(namespace && path),
    retry: false,
  };
}
