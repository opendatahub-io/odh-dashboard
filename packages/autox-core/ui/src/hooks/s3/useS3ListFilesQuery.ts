import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { S3Api, S3ListObjectsResponse } from '../../api/s3';

/**
 * Creates a `useS3ListFilesQuery` hook bound to a product's own `getFiles`
 * API function (as returned by `createS3Api`).
 */
export function createUseS3ListFilesQuery(
  getFiles: S3Api['getFiles'],
): (namespace?: string, path?: string) => UseQueryResult<S3ListObjectsResponse, Error> {
  return function useS3ListFilesQuery(
    namespace?: string,
    path?: string,
  ): UseQueryResult<S3ListObjectsResponse, Error> {
    return useQuery({
      queryKey: ['s3Files', namespace, path],
      queryFn: async ({ signal }) => {
        if (!namespace || !path) {
          throw new Error('namespace and path are required');
        }
        return getFiles(
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
    });
  };
}
