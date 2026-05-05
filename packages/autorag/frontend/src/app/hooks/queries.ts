import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getLlamaStackModels, getLlamaStackVectorStores, getSecrets } from '~/app/api/k8s';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import { getFiles as getS3Files } from '~/app/api/s3';
import {
  LlamaStackModelsResponse,
  LlamaStackModelType,
  LlamaStackFilteredVectorStoreProvidersResponse,
  PipelineRun,
  S3ListObjectsResponse,
  SecretListItem,
} from '~/app/types';
import { URL_PREFIX } from '~/app/utilities/const';
import { parseErrorStatus } from '~/app/utilities/utils';

export function useLlamaStackModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['autorag', 'models', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getLlamaStackModels('')(namespace, secretName)({});
        z.object({
          models: z.array(
            z.object({
              id: z.string(),
              type: z.union([z.literal('llm'), z.literal('embedding')]),
              provider: z.string(),
              // eslint-disable-next-line camelcase
              resource_path: z.string(),
            }),
          ),
        }).parse(response);
        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error('Invalid llama stack models response');
        }
        throw error;
      }
    },
    select: modelType
      ? (data) => ({ models: data.models.filter((m) => m.type === modelType) })
      : undefined,
  });
}

type FetchS3FileOptions = {
  secretName?: string;
  bucket?: string;
  signal?: AbortSignal;
};

/**
 * Fetches a file from S3 storage and returns it as a Blob.
 * This is a utility function that can be used in both hooks and query functions.
 */
export async function fetchS3File(
  namespace: string,
  key: string,
  options?: FetchS3FileOptions,
): Promise<Blob> {
  if (!key || !key.trim()) {
    throw new Error('File key must be a non-empty string');
  }

  const { secretName, bucket, signal } = options ?? {};
  const params = new URLSearchParams({
    namespace,
    ...(secretName && { secretName }),
    ...(bucket && { bucket }),
  });

  const response = await fetch(
    `${URL_PREFIX}/api/v1/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // If parsing fails, fall back to statusText
    }
    throw new Error(`Failed to fetch file: ${errorMessage}`);
  }

  return response.blob();
}

export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
): UseQueryResult<S3ListObjectsResponse, Error> {
  return useQuery({
    queryKey: ['autorag', 's3Files', namespace, path],
    queryFn: async ({ signal }) => {
      if (!namespace || !path) {
        throw new Error('namespace and path are required');
      }
      return getS3Files(
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

export function useLlamaStackVectorStoreProvidersQuery(
  namespace: string,
  secretName: string,
  providerTypes?: string[],
): UseQueryResult<LlamaStackFilteredVectorStoreProvidersResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    // providerTypes is intentionally excluded: select transforms cached data without
    // affecting the cache, so different provider type filters safely share one cache entry.
    queryKey: ['autorag', 'vectorStoreProviders', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getLlamaStackVectorStores('')(namespace, secretName)({});
        z.object({
          // eslint-disable-next-line camelcase
          vector_store_providers: z.array(
            z.object({
              // eslint-disable-next-line camelcase
              provider_id: z.string(),
              // eslint-disable-next-line camelcase
              provider_type: z.string(),
            }),
          ),
        }).parse(response);
        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error('Invalid llama stack vector store providers response');
        }
        throw error;
      }
    },
    // Filter by provider_type when a non-empty providerTypes array is given.
    // totalProviderCount preserves the unfiltered count so the UI can distinguish
    // "no providers at all" from "providers exist but none are supported".
    select: (data) => ({
      // eslint-disable-next-line camelcase
      vector_store_providers: data.vector_store_providers.filter(
        (p) => !providerTypes?.length || providerTypes.includes(p.provider_type),
      ),
      totalProviderCount: data.vector_store_providers.length,
    }),
  });
}

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED', 'CACHED']);
export const isTerminalState = (state: string): boolean => TERMINAL_STATES.has(state);
const POLL_INTERVAL_MS = 10000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRY_ATTEMPTS = 5;

export function usePipelineRunQuery(
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['autorag', 'pipelineRun', runId, namespace],
    queryFn: ({ signal }) => getPipelineRunFromBFF('', runId!, namespace!, { signal }),
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
      if (!state || isTerminalState(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}

export function useSecretsQuery(
  namespace: string,
  type?: 'storage' | 'lls',
): UseQueryResult<SecretListItem[], Error> {
  return useQuery({
    enabled: !!namespace,
    queryKey: ['autorag', 'secrets', namespace, type],
    queryFn: ({ signal }) => getSecrets('')(namespace, type)({ signal }),
  });
}
