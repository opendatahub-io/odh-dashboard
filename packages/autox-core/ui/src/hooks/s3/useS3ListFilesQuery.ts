import { useQuery, UseQueryResult } from '@tanstack/react-query';
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

  return useQuery({
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
  });
}
