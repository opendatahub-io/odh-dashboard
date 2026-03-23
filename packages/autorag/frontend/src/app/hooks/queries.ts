import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getLlamaStackModels } from '~/app/api/k8s';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import {
  LlamaStackModelsResponse,
  LlamaStackModelType,
  PipelineRun,
  S3ListObjectsResponse,
} from '~/app/types';
import { URL_PREFIX } from '~/app/utilities/const';

export function useLlamaStackModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['models', namespace, secretName],
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

/**
 * Fetches a file from S3 storage and returns it as a Blob.
 * This is a utility function that can be used in both hooks and query functions.
 */
export async function fetchS3File(
  namespace: string,
  key: string,
  secretName?: string,
  bucket?: string,
): Promise<Blob> {
  const params = new URLSearchParams({
    namespace,
    key,
    ...(secretName && { secretName }),
    ...(bucket && { bucket }),
  });

  const response = await fetch(`${URL_PREFIX}/api/v1/s3/file?${params.toString()}`);

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

/**
 * Fetches a list of files/folders from S3 storage.
 * This is a utility function that can be used in both hooks and query functions.
 */
export async function fetchS3Files(
  namespace: string,
  path: string,
): Promise<S3ListObjectsResponse> {
  const params = new URLSearchParams({
    namespace,
    path,
  });

  const response = await fetch(`${URL_PREFIX}/api/v1/s3/files?${params.toString()}`);

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
    throw new Error(`Failed to fetch S3 files: ${errorMessage}`);
  }

  const result = await response.json();
  return result?.data || result;
}

export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
): UseQueryResult<S3ListObjectsResponse, Error> {
  return useQuery({
    queryKey: ['s3Files', namespace, path],
    queryFn: async () => {
      if (!namespace || !path) {
        throw new Error('namespace and path are required');
      }
      return fetchS3Files(namespace, path);
    },
    enabled: Boolean(namespace && path),
    retry: false,
  });
}

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED']);
const POLL_INTERVAL_MS = 10000;

export function usePipelineRunQuery(
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['pipelineRun', runId, namespace],
    queryFn: ({ signal }) => getPipelineRunFromBFF('', runId!, namespace!, { signal }),
    enabled: !!runId && !!namespace,
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (!state || TERMINAL_STATES.has(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}
