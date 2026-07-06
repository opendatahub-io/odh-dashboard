import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getOgxModels, getOgxVectorStores, getSecrets } from '~/app/api/k8s';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import { getFiles as getS3Files } from '~/app/api/s3';
import {
  OgxModelsResponse,
  OgxModelType,
  OgxFilteredVectorStoreProvidersResponse,
  PipelineRun,
  S3ListObjectsResponse,
  SecretListItem,
} from '~/app/types';
import { URL_PREFIX } from '~/app/utilities/const';
import { normalizePipelineRun } from '~/app/utilities/pipelineRunUtils';
import { isRunInTerminalState, parseErrorStatus } from '~/app/utilities/utils';

export function useOgxModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: OgxModelType,
): UseQueryResult<OgxModelsResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['autorag', 'models', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getOgxModels('')(namespace, secretName)({});
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
          throw new Error('Invalid Open GenAI Stack models response');
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
  maxBytes?: number;
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

  const { secretName, bucket, signal, maxBytes } = options ?? {};
  const params = new URLSearchParams({
    namespace,
    ...(secretName && { secretName }),
    ...(bucket && { bucket }),
  });

  const abortController = maxBytes != null ? new AbortController() : undefined;
  const combinedSignal = abortController
    ? AbortSignal.any([abortController.signal, ...(signal ? [signal] : [])])
    : signal;

  const response = await fetch(
    `${URL_PREFIX}/api/v1/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
    { signal: combinedSignal },
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

  if (maxBytes != null) {
    const contentLength = response.headers.get('Content-Length');
    if (contentLength != null && parseInt(contentLength, 10) > maxBytes) {
      abortController?.abort();
      throw new Error(
        `S3 file too large: ${contentLength} bytes exceeds limit of ${maxBytes} bytes`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return response.blob();
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      received += value.byteLength;
      if (received > maxBytes) {
        abortController?.abort();
        throw new Error(`S3 file too large: exceeded limit of ${maxBytes} bytes during download`);
      }
      chunks.push(value);
    }
    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Blob([combined]);
  }

  return response.blob();
}

const DEFAULT_MAX_JSON_BYTES = 50 * 1024 * 1024; // 50 MB

export async function fetchS3Json<T>(
  namespace: string,
  key: string,
  options?: {
    signal?: AbortSignal;
    maxBytes?: number;
  },
): Promise<T> {
  const { signal, maxBytes = DEFAULT_MAX_JSON_BYTES } = options ?? {};
  const blob = await fetchS3File(namespace, key, { signal, maxBytes });
  const text = await blob.text();
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- caller accepts risk
  return JSON.parse(text) as T;
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

export function useOgxVectorStoreProvidersQuery(
  namespace: string,
  secretName: string,
  providerTypes?: string[],
): UseQueryResult<OgxFilteredVectorStoreProvidersResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    // providerTypes is intentionally excluded: select transforms cached data without
    // affecting the cache, so different provider type filters safely share one cache entry.
    queryKey: ['autorag', 'vectorStoreProviders', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getOgxVectorStores('')(namespace, secretName)({});
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
          throw new Error('Invalid Open GenAI Stack vector store providers response');
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

const POLL_INTERVAL_MS = 10000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRY_ATTEMPTS = 5;

export function usePipelineRunQuery(
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['autorag', 'pipelineRun', runId, namespace],
    queryFn: async ({ signal }) => {
      const run = await getPipelineRunFromBFF('', runId!, namespace!, { signal });
      return normalizePipelineRun(run);
    },
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
      if (!state || isRunInTerminalState(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}

export function useSecretsQuery(
  namespace: string,
  type?: 'storage' | 'ogx',
): UseQueryResult<SecretListItem[], Error> {
  return useQuery({
    enabled: !!namespace,
    queryKey: ['autorag', 'secrets', namespace, type],
    queryFn: ({ signal }) => getSecrets('')(namespace, type)({ signal }),
  });
}
