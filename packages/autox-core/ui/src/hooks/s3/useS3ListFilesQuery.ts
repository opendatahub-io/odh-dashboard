import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { S3ListObjectsResponse } from '../../api/s3';
import { useProductContext } from '../../context';

/**
 * Lists S3 files using the API client configured by ProductContext.
 */
export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
): UseQueryResult<S3ListObjectsResponse, Error> {
  const {
    api: { s3: s3Api },
  } = useProductContext();

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
