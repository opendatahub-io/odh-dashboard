import { useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import { getFiles as getS3Files } from '~/app/api/s3';
import type {
  ConfusionMatrixData,
  FeatureImportanceData,
  PipelineRun,
  S3ListObjectsResponse,
} from '~/app/types';
import { URL_PREFIX } from '~/app/utilities/const';

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
  type: 'integer' | 'double' | 'int64' | 'float64' | 'timestamp' | 'bool' | 'string';
  values?: (string | number)[];
};

/**
 * Zod schema to validate ColumnSchema array shape
 */
const ColumnSchemaArraySchema = z.array(
  z.object({
    name: z.string(),
    type: z.enum(['integer', 'double', 'int64', 'float64', 'timestamp', 'bool', 'string']),
    values: z.array(z.union([z.string(), z.number()])).optional(),
  }),
);

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

export function useS3GetFileSchemaQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<ColumnSchema[], Error> {
  return useQuery({
    queryKey: ['files', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName || !key) {
        return [];
      }

      const params = new URLSearchParams({
        namespace,
        secretName,
        key,
        ...(bucket && { bucket }),
      });

      const response = await fetch(`${URL_PREFIX}/api/v1/s3/file/schema?${params.toString()}`, {
        signal,
      });

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

      const result = await response.json();
      const columns = result?.data?.columns;

      if (!Array.isArray(columns)) {
        return [];
      }

      try {
        return ColumnSchemaArraySchema.parse(columns);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
          throw new Error(`Invalid column schema response: ${issues}`);
        }
        throw error;
      }
    },
    enabled: Boolean(namespace && secretName && key),
    retry: false,
    placeholderData: [],
  });
}

export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
): UseQueryResult<S3ListObjectsResponse, Error> {
  return useQuery({
    queryKey: ['s3Files', namespace, path],
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

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED', 'CACHED']);

export const isTerminalState = (state: string): boolean => TERMINAL_STATES.has(state);
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
      if (!state || isTerminalState(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}

/**
 * Zod schema to validate FeatureImportanceData shape
 */
/* eslint-disable camelcase */
const FeatureImportanceDataSchema = z.object({
  importance: z.record(z.string(), z.number()),
  stddev: z.record(z.string(), z.number()).optional(),
  p_value: z.record(z.string(), z.number()).optional(),
  n: z.record(z.string(), z.number()).optional(),
  p99_high: z.record(z.string(), z.number()).optional(),
  p99_low: z.record(z.string(), z.number()).optional(),
});
/* eslint-enable camelcase */

/**
 * Zod schema to validate ConfusionMatrixData shape
 * Records inherently allow optional keys, matching Partial<Record<...>> behavior
 */
const ConfusionMatrixDataSchema = z.record(z.string(), z.record(z.string(), z.number()));

/**
 * Fetches and parses JSON content from S3.
 *
 * @param namespace - K8s namespace
 * @param key - S3 object key
 * @param options - Optional configuration
 * @param options.signal - Abort signal for cancellation
 * @param options.schema - Optional Zod schema for runtime validation
 * @returns Parsed JSON cast to type T (validated if schema provided)
 */
export async function fetchS3Json<T>(
  namespace: string,
  key: string,
  options?: {
    signal?: AbortSignal;
    schema?: z.ZodSchema<T>;
  },
): Promise<T> {
  const { signal, schema } = options ?? {};
  const blob = await fetchS3File(namespace, key, { signal });
  const text = await blob.text();

  try {
    const parsed = JSON.parse(text);

    // Validate if schema provided, otherwise trust the data
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
      `Failed to parse JSON from S3 file "${key}": ${error instanceof Error ? error.message : 'Invalid JSON'}`,
    );
  }
}

/**
 * Zod schemas to validate AutomlModel shape from model.json files.
 * Tabular and timeseries models have different location structures:
 *   - Tabular:     location.notebook  (singular, full path to notebook file)
 *   - Timeseries:  location.notebooks (plural, directory containing notebooks)
 * model_directory is optional in the raw file since it gets rewritten after parsing.
 */
/* eslint-disable camelcase */
const AutomlTabularModelSchema = z.object({
  name: z.string(),
  location: z.object({
    model_directory: z.string().optional(),
    predictor: z.string(),
    notebook: z.string(),
  }),
  metrics: z.object({
    test_data: z.record(z.string(), z.number()),
  }),
});

const AutomlTimeseriesModelSchema = z.object({
  name: z.string(),
  base_model: z.string(),
  location: z.object({
    model_directory: z.string().optional(),
    predictor: z.string(),
    notebooks: z.string(),
    metrics: z.string(),
  }),
  metrics: z.object({
    test_data: z.record(z.string(), z.number()),
  }),
});

export const AutomlModelSchema = z.union([AutomlTabularModelSchema, AutomlTimeseriesModelSchema]);

export type AutomlRawTabularModel = z.infer<typeof AutomlTabularModelSchema>;
export type AutomlRawTimeseriesModel = z.infer<typeof AutomlTimeseriesModelSchema>;
export type AutomlRawModel = AutomlRawTabularModel | AutomlRawTimeseriesModel;

export const isRawTimeseriesModel = (model: AutomlRawModel): model is AutomlRawTimeseriesModel =>
  'base_model' in model;
/* eslint-enable camelcase */

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
            {
              signal,
              schema: FeatureImportanceDataSchema,
            },
          ),
        enabled: Boolean(namespace && modelDirectory),
        retry: false,
      },
      {
        queryKey: ['confusionMatrix', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<ConfusionMatrixData>(namespace!, `${baseDir}metrics/confusion_matrix.json`, {
            signal,
            schema: ConfusionMatrixDataSchema,
          }),
        enabled: Boolean(namespace && modelDirectory && isClassification),
        retry: false,
      },
    ],
    combine: (results) => ({
      featureImportance: results[0].data,
      confusionMatrix: results[1].data,
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}
