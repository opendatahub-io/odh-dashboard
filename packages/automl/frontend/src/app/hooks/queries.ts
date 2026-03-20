import { useQuery, useMutation, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { URL_PREFIX } from '~/app/utilities/const';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun, S3ListObjectsResponse } from '~/app/types';
import { createPipelineRun, getPipelineRunFromBFF } from '~/app/api/pipelines';

export function useExperimentsQuery(): UseQueryResult<never[], Error> {
  return useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const experiments: never[] = [];
      return experiments;
    },
  });
}

export function useExperimentQuery(
  experimentId?: string,
): UseQueryResult<{ display_name: string }, Error> {
  return useQuery({
    queryKey: ['experiments', experimentId],
    queryFn: async () => {
      // eslint-disable-next-line camelcase
      const experiment = { display_name: 'FAKE_EXPERIMENT_NAME' };
      return experiment;
    },
    enabled: !!experimentId,
  });
}

export type ColumnSchema = {
  name: string;
  type: 'integer' | 'double' | 'timestamp' | 'bool' | 'string';
  values?: (string | number)[];
};

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

export function useS3GetFileQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<Blob, Error> {
  return useQuery({
    queryKey: ['file', namespace, secretName, bucket, key],
    queryFn: async () => {
      if (!namespace || !key) {
        throw new Error('namespace and key are required');
      }
      return fetchS3File(namespace, key, secretName, bucket);
    },
    enabled: Boolean(namespace && key),
    retry: false,
  });
}

export function useS3GetFileSchemaQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<ColumnSchema[], Error> {
  return useQuery({
    queryKey: ['files', namespace, secretName, bucket, key],
    queryFn: async () => {
      if (!namespace || !secretName || !key) {
        return [];
      }

      const params = new URLSearchParams({
        namespace,
        secretName,
        key,
        ...(bucket && { bucket }),
      });

      const response = await fetch(`${URL_PREFIX}/api/v1/s3/file/schema?${params.toString()}`);

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
        throw new Error(`Failed to fetch file schema: ${errorMessage}`);
      }

      const data = await response.json();
      const columns = data?.data?.columns;
      if (!Array.isArray(columns)) {
        return [];
      }
      return columns;
    },
    enabled: Boolean(namespace && secretName && key),
    retry: false,
    placeholderData: [],
  });
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

type CreatePipelineRunVariables = {
  namespace: string;
  data: ConfigureSchema;
};

export function useCreatePipelineRun(): UseMutationResult<
  PipelineRun,
  Error,
  CreatePipelineRunVariables
> {
  return useMutation({
    mutationFn: async ({ namespace, data }: CreatePipelineRunVariables) =>
      createPipelineRun('', { namespace, data }),
  });
}
