import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useS3FileFetchers } from '@odh-dashboard/autox-core/ui/hooks';

export function useS3GetFileQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<Blob, Error> {
  const { fetchS3File } = useS3FileFetchers();
  return useQuery({
    queryKey: ['file', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !key) {
        throw new Error('namespace and key are required');
      }
      return fetchS3File(namespace, key, { secretName, bucket, signal });
    },
    enabled: Boolean(namespace && key),
    retry: false,
  });
}
