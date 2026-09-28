import { useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { useCallback, useMemo } from 'react';
import { combineAbortSignals } from '../../api/s3/s3';
import type { FetchS3FileOptions, FetchS3JsonOptions } from '../../api/s3/s3';
import type { S3ListObjectsResponse } from '../../api/s3/types';
import { useAutoXApi } from '../../context/AutoXApiContext';

export type S3FileFetchers = {
  fetchS3File: (namespace: string, key: string, options?: FetchS3FileOptions) => Promise<Blob>;
  fetchS3Json: <T>(
    namespace: string,
    key: string,
    options?: FetchS3JsonOptions<T> & { fresh?: boolean },
  ) => Promise<T>;
};

type S3JsonQueryKeyOptions = Pick<
  FetchS3JsonOptions<unknown>,
  'secretName' | 'bucket' | 'view' | 'maxBytes'
>;

const getS3JsonQueryKey = (namespace: string, key: string, options?: S3JsonQueryKeyOptions) => {
  if (!options) {
    return ['s3Json', namespace, key] as const;
  }

  return [
    's3Json',
    namespace,
    key,
    options.secretName,
    options.bucket,
    options.view,
    options.maxBytes ?? 50 * 1024 * 1024,
  ] as const;
};

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
        queryFn: ({ signal }) => {
          const combined = combineAbortSignals(options?.signal, signal);
          return s3Api
            .fetchS3File(namespace, key, { ...options, signal: combined.signal })
            .finally(combined.cleanup);
        },
        staleTime: 5 * 60 * 1000,
      }),
    [queryClient, s3Api],
  );

  const fetchS3Json = useCallback(
    async <T>(
      namespace: string,
      key: string,
      options?: FetchS3JsonOptions<T> & { fresh?: boolean },
    ): Promise<T> => {
      const maxBytes = options?.maxBytes ?? 50 * 1024 * 1024;
      const { fresh, signal: callerSignal, schema, ...s3Options } = options ?? {};
      const text = await queryClient.fetchQuery({
        queryKey: getS3JsonQueryKey(namespace, key, { ...options, maxBytes }),
        queryFn: ({ signal }) => {
          const combined = combineAbortSignals(callerSignal, signal);
          return s3Api
            .fetchS3File(namespace, key, { ...s3Options, maxBytes, signal: combined.signal })
            .then((blob) => blob.text())
            .finally(combined.cleanup);
        },
        staleTime: fresh ? 0 : 5 * 60 * 1000,
      });

      try {
        const parsed: unknown = JSON.parse(text);
        if (schema) {
          return schema.parse(parsed);
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

  return useMemo(() => ({ fetchS3File, fetchS3Json }), [fetchS3File, fetchS3Json]);
}

export function useS3CacheActions(): {
  invalidateS3JsonCache: (namespace: string, key: string) => Promise<void>;
  invalidateS3Results: (namespace?: string) => Promise<void>;
} {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      invalidateS3JsonCache: async (namespace: string, key: string) => {
        await queryClient.invalidateQueries({ queryKey: getS3JsonQueryKey(namespace, key) });
      },
      invalidateS3Results: async (namespace?: string) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['s3Files', namespace] }),
          queryClient.invalidateQueries({ queryKey: ['s3Json', namespace] }),
          queryClient.invalidateQueries({ queryKey: ['s3File', namespace] }),
        ]);
      },
    }),
    [queryClient],
  );
}

export function useS3FileOperations(): {
  listS3Files: (
    namespace: string,
    path: string,
    signal?: AbortSignal,
  ) => Promise<S3ListObjectsResponse>;
} {
  const { s3: s3Api } = useAutoXApi();
  return useMemo(
    () => ({
      listS3Files: (namespace: string, path: string, signal?: AbortSignal) =>
        s3Api.getFiles('', { signal }, { namespace, path }),
    }),
    [s3Api],
  );
}
