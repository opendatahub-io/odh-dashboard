import { useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { useCallback } from 'react';
import type { FetchS3JsonOptions, S3FileFetchers } from '../../api/s3';
import { useAutoXApi } from '../../context';

export function useS3FileFetchers(): S3FileFetchers {
  const queryClient = useQueryClient();
  const { s3: s3Api } = useAutoXApi();

  const fetchS3File = useCallback<S3FileFetchers['fetchS3File']>(
    (namespace, key, options) =>
      queryClient.fetchQuery({
        queryKey: [
          's3File',
          namespace,
          key,
          options?.secretName,
          options?.bucket,
          options?.view,
          options?.maxBytes,
        ],
        queryFn: ({ signal }) => s3Api.fetchS3File(namespace, key, { ...options, signal }),
        staleTime: 5 * 60 * 1000,
      }),
    [queryClient, s3Api],
  );

  const fetchS3Json = useCallback(
    async <T>(namespace: string, key: string, options?: FetchS3JsonOptions<T>): Promise<T> => {
      const maxBytes = options?.maxBytes ?? 50 * 1024 * 1024;
      const text = await queryClient.fetchQuery({
        queryKey: [
          's3Json',
          namespace,
          key,
          options?.secretName,
          options?.bucket,
          options?.view,
          maxBytes,
        ],
        queryFn: ({ signal }) =>
          s3Api
            .fetchS3File(namespace, key, { ...options, maxBytes, signal })
            .then((blob) => blob.text()),
        staleTime: 5 * 60 * 1000,
      });

      try {
        const parsed: unknown = JSON.parse(text);
        if (options?.schema) {
          return options.schema.parse(parsed);
        }
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- no schema provided, caller accepts risk
        return parsed as T;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
          throw new Error(`Invalid JSON structure from S3 file "${key}": ${issues}`);
        }
        throw new Error(
          `Failed to parse JSON from S3 file "${key}": ${
            error instanceof Error ? error.message : 'Invalid JSON'
          }`,
        );
      }
    },
    [queryClient, s3Api],
  );

  return { fetchS3File, fetchS3Json };
}
