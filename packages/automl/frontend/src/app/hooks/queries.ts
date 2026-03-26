import {
  useQuery,
  useQueries,
  useMutation,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { URL_PREFIX } from '~/app/utilities/const';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';
import { createPipelineRun } from '~/app/api/pipelines';

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
  const { secretName, bucket, signal } = options ?? {};
  const params = new URLSearchParams({
    namespace,
    key,
    ...(secretName && { secretName }),
    ...(bucket && { bucket }),
  });

  const response = await fetch(`${URL_PREFIX}/api/v1/s3/file?${params.toString()}`, { signal });

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

export function useFilesQuery(
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

export function usePipelineRunQuery(
  runId?: string,
): UseQueryResult<{ experiment_id: string }, Error> {
  return useQuery({
    queryKey: ['pipelineRun', runId],
    queryFn: async () => {
      // eslint-disable-next-line camelcase
      const pipelineRun = { experiment_id: 'FAKE_EXPERIMENT_ID' };
      return pipelineRun;
    },
    enabled: !!runId,
  });
}

async function fetchS3Json<T>(namespace: string, key: string, signal?: AbortSignal): Promise<T> {
  const blob = await fetchS3File(namespace, key, { signal });
  const text = await blob.text();
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- trusted pipeline-produced JSON
  return JSON.parse(text) as T;
}

export function useModelEvaluationArtifactsQuery(
  namespace?: string,
  modelDirectory?: string,
  isClassification?: boolean,
): {
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
  isLoading: boolean;
} {
  const baseDir = modelDirectory?.endsWith('/') ? modelDirectory : `${modelDirectory}/`;
  return useQueries({
    queries: [
      {
        queryKey: ['featureImportance', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<FeatureImportanceData>(
            namespace!,
            `${baseDir}metrics/feature_importance.json`,
            signal,
          ),
        enabled: Boolean(namespace && modelDirectory),
        retry: false,
      },
      {
        queryKey: ['confusionMatrix', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<ConfusionMatrixData>(
            namespace!,
            `${baseDir}metrics/confusion_matrix.json`,
            signal,
          ),
        enabled: Boolean(namespace && modelDirectory && isClassification),
        retry: false,
      },
    ],
    combine: (results) => ({
      featureImportance: results[0].data,
      confusionMatrix: results[1].data,
      isLoading: results.some((r) => r.isPending),
    }),
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
