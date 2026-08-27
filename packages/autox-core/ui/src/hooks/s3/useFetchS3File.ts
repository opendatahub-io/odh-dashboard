import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { FetchS3FileOptions } from '../../api/s3';
import { useAutoXApi } from '../../context';

export function useFetchS3File(): (
  namespace: string,
  key: string,
  options?: FetchS3FileOptions,
) => Promise<Blob> {
  const queryClient = useQueryClient();
  const { s3: s3Api } = useAutoXApi();

  return useCallback(
    (namespace: string, key: string, options?: FetchS3FileOptions) =>
      queryClient.fetchQuery({
        queryKey: ['s3File', namespace, key, options?.secretName, options?.bucket, options?.view],
        queryFn: ({ signal }) => s3Api.fetchS3File(namespace, key, { ...options, signal }),
        staleTime: 0,
      }),
    [queryClient, s3Api],
  );
}
